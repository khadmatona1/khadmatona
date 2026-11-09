<?php

namespace App\Modules\Rental\Application;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Rental\Application\Concerns\ResolvesPropertyTitles;
use App\Modules\Rental\Domain\Contracts\CleaningRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Domain\Enums\CleaningStatus;
use App\Modules\Rental\Domain\Enums\ReservationStatus;
use App\Modules\Rental\Domain\Models\ManagedProperty;
use App\Modules\Rental\Domain\Models\Reservation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The reservation lifecycle and its business rules:
 *  - only an actively managed property can be booked;
 *  - two live stays of the same property never overlap (same-day
 *    turnover is fine);
 *  - the platform fee can't exceed what the guest paid;
 *  - the property's commission rate is frozen on the reservation;
 *  - confirmed -> checked_in -> checked_out, or confirmed -> cancelled;
 *  - checking out schedules the cleaning automatically.
 * Rule violations are 422s on the offending field, like shape errors.
 */
class ReservationService
{
    use ResolvesPropertyTitles;

    public function __construct(
        private readonly ReservationRepositoryInterface $reservations,
        private readonly ManagedPropertyRepositoryInterface $managedProperties,
        private readonly CleaningRepositoryInterface $cleanings,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes  Validated, amounts already in cents.
     */
    public function create(array $attributes): Reservation
    {
        // Public approvals and admin-created stays share the same property lock.
        return DB::transaction(fn () => $this->createLocked($attributes));
    }

    private function createLocked(array $attributes): Reservation
    {
        /** @var ManagedProperty|null $managed */
        $managed = $this->managedProperties->lock($attributes['rental_property_id']);
        if (! $managed || ! $managed->is_active) {
            throw ValidationException::withMessages(['rental_property_id' => 'This property is not under active rental management.']);
        }

        $this->assertBookable($managed->id, $attributes);

        /** @var Reservation $reservation */
        $reservation = $this->reservations->create([
            ...$attributes,
            'property_id' => $managed->property_id,
            'commission_rate_bp' => $managed->commission_rate_bp,
            'status' => ReservationStatus::Confirmed,
        ]);

        return $this->withDisplay($reservation);
    }

    /**
     * @param  array<string, mixed>  $attributes  Validated, amounts already in cents.
     */
    public function update(Reservation $reservation, array $attributes): Reservation
    {
        return DB::transaction(function () use ($reservation, $attributes) {
            $this->managedProperties->lock($reservation->rental_property_id);

            return $this->updateLocked($this->reservations->findOrFail($reservation->id), $attributes);
        });
    }

    private function updateLocked(Reservation $reservation, array $attributes): Reservation
    {
        if ($reservation->status === ReservationStatus::Cancelled) {
            throw ValidationException::withMessages(['status' => 'A cancelled reservation can no longer be edited.']);
        }

        $merged = [
            'check_in_date' => $attributes['check_in_date'] ?? $reservation->check_in_date->toDateString(),
            'check_out_date' => $attributes['check_out_date'] ?? $reservation->check_out_date->toDateString(),
            'total_amount' => $attributes['total_amount'] ?? $reservation->total_amount,
            'platform_fee' => $attributes['platform_fee'] ?? $reservation->platform_fee,
        ];
        $this->assertBookable($reservation->rental_property_id, $merged, $reservation->id);

        /** @var Reservation $reservation */
        $reservation = $this->reservations->update($reservation, $attributes);

        return $this->withDisplay($reservation);
    }

    public function checkIn(Reservation $reservation, ?string $notes): Reservation
    {
        $this->assertStatus($reservation, ReservationStatus::Confirmed, 'Only a confirmed reservation can be checked in.');

        /** @var Reservation $reservation */
        $reservation = $this->reservations->update($reservation, [
            'status' => ReservationStatus::CheckedIn,
            'checked_in_at' => Carbon::now(),
            'check_in_notes' => $notes,
        ]);

        return $this->withDisplay($reservation);
    }

    /**
     * Check-out and the follow-up cleaning happen together or not at all.
     */
    public function checkOut(Reservation $reservation, ?string $notes): Reservation
    {
        $this->assertStatus($reservation, ReservationStatus::CheckedIn, 'Only a checked-in reservation can be checked out.');

        $reservation = DB::transaction(function () use ($reservation, $notes) {
            /** @var Reservation $reservation */
            $reservation = $this->reservations->update($reservation, [
                'status' => ReservationStatus::CheckedOut,
                'checked_out_at' => Carbon::now(),
                'check_out_notes' => $notes,
            ]);

            /** @var ManagedProperty $managed */
            $managed = $this->managedProperties->findOrFail($reservation->rental_property_id);

            $this->cleanings->create([
                'rental_property_id' => $managed->id,
                'property_id' => $managed->property_id,
                'reservation_id' => $reservation->id,
                'scheduled_for' => $reservation->check_out_date->toDateString(),
                'status' => CleaningStatus::Pending,
                'cost' => $managed->cleaning_fee,
                'charged_to' => $managed->cleaning_charged_to,
            ]);

            return $reservation;
        });

        return $this->withDisplay($reservation);
    }

    public function cancel(Reservation $reservation): Reservation
    {
        $this->assertStatus($reservation, ReservationStatus::Confirmed, 'Only a reservation that has not started can be cancelled.');

        /** @var Reservation $reservation */
        $reservation = $this->reservations->update($reservation, ['status' => ReservationStatus::Cancelled]);

        return $this->withDisplay($reservation);
    }

    public function delete(Reservation $reservation): void
    {
        $this->reservations->delete($reservation);
    }

    /**
     * @param  array<string, mixed>  $stay  check_in_date, check_out_date, total_amount, platform_fee
     */
    private function assertBookable(int $rentalPropertyId, array $stay, ?int $ignoreId = null): void
    {
        $checkIn = Carbon::parse($stay['check_in_date']);
        $checkOut = Carbon::parse($stay['check_out_date']);

        if ($checkOut->lte($checkIn)) {
            throw ValidationException::withMessages(['check_out_date' => 'The check-out date must be after the check-in date.']);
        }

        if ((int) ($stay['platform_fee'] ?? 0) > (int) ($stay['total_amount'] ?? 0)) {
            throw ValidationException::withMessages(['platform_fee' => 'The platform fee cannot exceed the total amount.']);
        }

        if ($this->reservations->hasOverlap($rentalPropertyId, $checkIn, $checkOut, $ignoreId)) {
            throw ValidationException::withMessages(['check_in_date' => __('booking.unavailable')]);
        }
    }

    private function assertStatus(Reservation $reservation, ReservationStatus $expected, string $message): void
    {
        if ($reservation->status !== $expected) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }
}
