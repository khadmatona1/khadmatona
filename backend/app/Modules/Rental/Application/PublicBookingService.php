<?php

namespace App\Modules\Rental\Application;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\Rental\Domain\Contracts\BookingRequestRepository;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Domain\Models\BookingRequest;
use App\Modules\Rental\Domain\Models\ManagedProperty;
use App\Modules\Rental\Domain\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublicBookingService
{
    public function __construct(
        private readonly BookingRequestRepository $requests,
        private readonly ManagedPropertyRepositoryInterface $managedProperties,
        private readonly ReservationRepositoryInterface $reservations,
        private readonly PropertyDirectory $properties,
        private readonly ReservationService $reservationService,
        private readonly StayContractService $stayContracts,
    ) {}

    private function property(int $propertyId): ManagedProperty
    {
        $managed = $this->managedProperties->findByPropertyIdWithTrashed($propertyId);
        abort_unless($managed && ! $managed->trashed() && $managed->is_active && $this->properties->isPubliclyAvailable($propertyId), 404);

        return $managed;
    }

    public function availability(int $propertyId, array $dates): array
    {
        $managed = $this->property($propertyId);
        $available = isset($dates['check_in_date'], $dates['check_out_date'])
            ? ! $this->reservations->hasOverlap($managed->id, CarbonImmutable::parse($dates['check_in_date']), CarbonImmutable::parse($dates['check_out_date']))
            : null;

        // Never expose guest details, reservation IDs, prices, or management terms.
        return ['bookable' => true, 'available' => $available];
    }

    public function submit(array $attributes): BookingRequest
    {
        unset($attributes['consent'], $attributes['website']);
        $attributes['notes'] ??= null;
        $attributes['guest_email'] ??= null;
        $attributes['property_id'] = (int) $attributes['property_id'];
        $attributes['guests_count'] = (int) $attributes['guests_count'];
        ksort($attributes);
        $fingerprint = hash('sha256', json_encode($attributes, JSON_THROW_ON_ERROR));
        $existing = $this->requests->byKey($attributes['request_key']);
        if ($existing) {
            return $this->sameRequest($existing, $fingerprint);
        }
        $managed = $this->property($attributes['property_id']);

        try {
            return DB::transaction(function () use ($managed, $attributes, $fingerprint) {
                $locked = $this->managedProperties->lock($managed->id);
                abort_unless($locked->is_active && $this->properties->isPubliclyAvailable($locked->property_id), 404);
                if ($existing = $this->requests->byKey($attributes['request_key'])) {
                    return $this->sameRequest($existing, $fingerprint);
                }
                if ($this->reservations->hasOverlap($locked->id, CarbonImmutable::parse($attributes['check_in_date']), CarbonImmutable::parse($attributes['check_out_date']))) {
                    throw ValidationException::withMessages(['check_in_date' => __('booking.unavailable')]);
                }

                return $this->requests->create([
                    ...$attributes, 'reference' => (string) Str::ulid(), 'fingerprint' => $fingerprint,
                    'rental_property_id' => $locked->id, 'status' => 'pending', 'consented_at' => now(),
                ]);
            });
        } catch (UniqueConstraintViolationException $exception) {
            // Also handles an attempted reuse of the key on another property.
            $existing = $this->requests->byKey($attributes['request_key']);
            if (! $existing) {
                throw $exception;
            }

            return $this->sameRequest($existing, $fingerprint);
        }
    }

    private function sameRequest(BookingRequest $existing, string $fingerprint): BookingRequest
    {
        if (! hash_equals($existing->fingerprint, $fingerprint)) {
            throw ValidationException::withMessages(['request_key' => __('booking.changed_request')]);
        }

        return $existing;
    }

    public function confirm(BookingRequest $booking, int|float|string $total): BookingRequest
    {
        $booking = DB::transaction(function () use ($booking, $total) {
            $locked = $this->managedProperties->lock($booking->rental_property_id);
            $booking = $this->requests->locked($booking->id);
            if ($booking->status === 'confirmed') {
                return $booking;
            }
            $this->assertPending($booking);
            if (! $locked->is_active || ! $this->properties->isPubliclyAvailable($booking->property_id)) {
                throw ValidationException::withMessages(['property_id' => __('booking.property_unavailable')]);
            }
            if ($booking->check_in_date->toDateString() < CarbonImmutable::now((string) config('app.business_timezone'))->toDateString()) {
                throw ValidationException::withMessages(['check_in_date' => __('booking.past_request')]);
            }
            $reservation = $this->reservationService->create([
                'rental_property_id' => $locked->id, 'guest_name' => $booking->guest_name,
                'guest_phone' => $booking->guest_phone, 'guest_email' => $booking->guest_email,
                'guests_count' => $booking->guests_count, 'channel' => 'direct',
                'check_in_date' => $booking->check_in_date->toDateString(), 'check_out_date' => $booking->check_out_date->toDateString(),
                'total_amount' => Money::toCents($total), 'platform_fee' => 0, 'notes' => $booking->notes,
            ]);

            return $this->requests->update($booking, ['status' => 'confirmed', 'reservation_id' => $reservation->id]);
        });

        $this->stayContracts->createAndNotify($booking);

        return $booking;
    }

    public function reject(BookingRequest $booking): BookingRequest
    {
        return DB::transaction(function () use ($booking) {
            $booking = $this->requests->locked($booking->id);
            $this->assertPending($booking);

            return $this->requests->update($booking, ['status' => 'rejected']);
        });
    }

    private function assertPending(BookingRequest $booking): void
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages(['status' => __('booking.not_pending')]);
        }
    }
}
