<?php

namespace App\Modules\Rental\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Domain\Enums\ReservationStatus;
use App\Modules\Rental\Domain\Models\Reservation;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class EloquentReservationRepository extends BaseRepository implements ReservationRepositoryInterface
{
    protected function model(): string
    {
        return Reservation::class;
    }

    public function hasOverlap(int $rentalPropertyId, CarbonInterface $checkIn, CarbonInterface $checkOut, ?int $ignoreId = null): bool
    {
        return Reservation::query()
            ->where('rental_property_id', $rentalPropertyId)
            ->where('status', '!=', ReservationStatus::Cancelled->value)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            // Half-open intervals: [in, out) - same-day turnover is allowed.
            // Date casts may persist midnight in SQLite; compare calendar dates only.
            ->whereDate('check_in_date', '<', $checkOut->toDateString())
            ->whereDate('check_out_date', '>', $checkIn->toDateString())
            ->exists();
    }

    public function revenueByProperty(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds = null): array
    {
        $rows = Reservation::query()
            ->where('status', '!=', ReservationStatus::Cancelled->value)
            ->whereBetween('check_in_date', [$from->toDateString(), $to->toDateString()])
            ->when($propertyIds !== null, fn ($query) => $query->whereIn('property_id', $propertyIds))
            ->toBase()
            ->selectRaw(
                'property_id,
                 count(*) as reservations,
                 sum(datediff(check_out_date, check_in_date)) as nights,
                 sum(total_amount) as gross,
                 sum(platform_fee) as platform_fees,
                 sum(greatest(total_amount - platform_fee, 0)) as net,
                 sum(round(greatest(total_amount - platform_fee, 0) * commission_rate_bp / 10000)) as commission'
            )
            ->groupBy('property_id')
            ->get();

        $revenue = [];
        foreach ($rows as $row) {
            $revenue[(int) $row->property_id] = [
                'reservations' => (int) $row->reservations,
                'nights' => (int) $row->nights,
                'gross' => (int) $row->gross,
                'platform_fees' => (int) $row->platform_fees,
                'net' => (int) $row->net,
                'commission' => (int) $row->commission,
            ];
        }

        return $revenue;
    }

    public function overlapping(CarbonInterface $from, CarbonInterface $to): Collection
    {
        return Reservation::query()
            ->where('status', '!=', ReservationStatus::Cancelled->value)
            ->whereDate('check_in_date', '<', $to->toDateString())
            ->whereDate('check_out_date', '>', $from->toDateString())
            ->get(['id', 'rental_property_id', 'check_in_date', 'check_out_date']);
    }

    public function withDateBetween(string $column, CarbonInterface $from, CarbonInterface $to, array $statuses, int $limit = 20): Collection
    {
        if (! in_array($column, ['check_in_date', 'check_out_date'], true)) {
            throw new InvalidArgumentException("Unsupported reservation date column [{$column}].");
        }

        return Reservation::query()
            ->whereIn('status', $statuses)
            ->whereBetween($column, [$from->toDateString(), $to->toDateString()])
            ->orderBy($column)
            ->limit($limit)
            ->get();
    }

    public function countByStatus(string $status): int
    {
        return Reservation::query()->where('status', $status)->count();
    }

    public function forPropertiesBetween(array $propertyIds, CarbonInterface $from, CarbonInterface $to): Collection
    {
        if ($propertyIds === []) {
            return collect();
        }

        return Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', '!=', ReservationStatus::Cancelled->value)
            ->whereBetween('check_in_date', [$from->toDateString(), $to->toDateString()])
            ->orderByDesc('check_in_date')
            ->get();
    }
}
