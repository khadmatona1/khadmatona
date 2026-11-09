<?php

namespace App\Modules\Rental\Infrastructure\Repositories;

use App\Modules\Rental\Domain\Contracts\BookingRequestRepository;
use App\Modules\Rental\Domain\Models\BookingRequest;

class EloquentBookingRequestRepository implements BookingRequestRepository
{
    public function byKey(string $key): ?BookingRequest
    {
        return BookingRequest::where('request_key', $key)->first();
    }

    public function locked(int $id): BookingRequest
    {
        return BookingRequest::query()->lockForUpdate()->findOrFail($id);
    }

    public function create(array $attributes): BookingRequest
    {
        return BookingRequest::create($attributes);
    }

    public function update(BookingRequest $booking, array $attributes): BookingRequest
    {
        $booking->update($attributes);

        return $booking->refresh();
    }
}
