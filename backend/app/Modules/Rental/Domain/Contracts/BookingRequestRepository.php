<?php

namespace App\Modules\Rental\Domain\Contracts;

use App\Modules\Rental\Domain\Models\BookingRequest;

interface BookingRequestRepository
{
    public function byKey(string $key): ?BookingRequest;

    public function locked(int $id): BookingRequest;

    public function create(array $attributes): BookingRequest;

    public function update(BookingRequest $booking, array $attributes): BookingRequest;
}
