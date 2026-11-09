<?php

namespace App\Modules\Rental\Application;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\CleaningRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\MaintenanceRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Domain\Enums\ReservationStatus;
use App\Modules\Rental\Domain\Models\Cleaning;
use App\Modules\Rental\Domain\Models\Reservation;
use App\Modules\Rental\Domain\Support\Money;
use Carbon\CarbonImmutable;

/**
 * The day-to-day view: who arrives and leaves, what needs cleaning or
 * fixing, occupancy and this month's split.
 */
class RentalDashboardService
{
    public function __construct(
        private readonly ManagedPropertyRepositoryInterface $managedProperties,
        private readonly ReservationRepositoryInterface $reservations,
        private readonly CleaningRepositoryInterface $cleanings,
        private readonly MaintenanceRepositoryInterface $maintenance,
        private readonly RentalStatementService $statements,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        $today = CarbonImmutable::now((string) config('app.business_timezone'))->startOfDay();
        $nextWeek = $today->addDays(7);

        $arrivals = $this->reservations->withDateBetween('check_in_date', $today, $nextWeek, [ReservationStatus::Confirmed->value]);
        $departures = $this->reservations->withDateBetween('check_out_date', $today, $nextWeek, [ReservationStatus::CheckedIn->value]);
        $cleanings = $this->cleanings->pendingUntil($nextWeek);

        $propertyIds = array_values(array_unique([
            ...$arrivals->pluck('property_id')->all(),
            ...$departures->pluck('property_id')->all(),
            ...$cleanings->pluck('property_id')->all(),
        ]));
        $titles = $this->properties->titlesByIds($propertyIds);

        $statement = $this->statements->forMonth($today->format('Y-m'));

        return [
            'today' => $today->toDateString(),
            'counts' => [
                'managed_properties' => $this->managedProperties->countActive(),
                'in_house' => $this->reservations->countByStatus(ReservationStatus::CheckedIn->value),
                'arrivals_today' => $arrivals->filter(fn (Reservation $r) => $r->check_in_date->isSameDay($today))->count(),
                'departures_today' => $departures->filter(fn (Reservation $r) => $r->check_out_date->isSameDay($today))->count(),
                'pending_cleanings' => $this->cleanings->countPending(),
                ...array_combine(['open_maintenance', 'urgent_maintenance'], array_values($this->maintenance->openCounts())),
            ],
            'occupancy_rate' => $this->occupancyRate($today),
            'month' => [
                'month' => $statement['month'],
                ...$statement['totals'],
            ],
            'arrivals' => $arrivals->map(fn (Reservation $r) => $this->stay($r, $titles))->values()->all(),
            'departures' => $departures->map(fn (Reservation $r) => $this->stay($r, $titles))->values()->all(),
            'cleanings' => $cleanings->map(fn (Cleaning $c) => [
                'id' => $c->id,
                'property_id' => $c->property_id,
                'property_title' => $titles[$c->property_id] ?? null,
                'scheduled_for' => $c->scheduled_for->toDateString(),
                'cleaner_name' => $c->cleaner_name,
                'overdue' => $c->scheduled_for->lt($today),
            ])->values()->all(),
        ];
    }

    /**
     * Booked nights this month / (active managed properties x days).
     */
    private function occupancyRate(CarbonImmutable $today): float
    {
        $from = $today->startOfMonth();
        $to = $from->addMonth();
        $capacity = $this->managedProperties->countActive() * $from->daysInMonth;

        if ($capacity === 0) {
            return 0.0;
        }

        $booked = 0;
        foreach ($this->reservations->overlapping($from, $to) as $reservation) {
            $start = max($reservation->check_in_date->getTimestamp(), $from->getTimestamp());
            $end = min($reservation->check_out_date->getTimestamp(), $to->getTimestamp());
            $booked += max(0, (int) round(($end - $start) / 86_400));
        }

        return round(min(100, $booked / $capacity * 100), 1);
    }

    /**
     * @param  array<int, string>  $titles
     * @return array<string, mixed>
     */
    private function stay(Reservation $reservation, array $titles): array
    {
        return [
            'id' => $reservation->id,
            'property_id' => $reservation->property_id,
            'property_title' => $titles[$reservation->property_id] ?? null,
            'guest_name' => $reservation->guest_name,
            'guests_count' => $reservation->guests_count,
            'check_in_date' => $reservation->check_in_date->toDateString(),
            'check_out_date' => $reservation->check_out_date->toDateString(),
            'channel' => $reservation->channel->value,
            'status' => $reservation->status->value,
            'total_amount' => Money::toMad($reservation->total_amount),
        ];
    }
}
