<?php

namespace App\Modules\Rental\Http\Filters;

use App\Modules\Rental\Domain\Models\Reservation;
use Spatie\QueryBuilder\AllowedFilter;

class ReservationFilter extends RentalFilter
{
    protected function model(): string
    {
        return Reservation::class;
    }

    protected function table(): string
    {
        return 'rental_reservations';
    }

    protected function allowedFilters(): array
    {
        return [
            ...$this->commonFilters(),
            AllowedFilter::exact('status', 'rental_reservations.status'),
            AllowedFilter::exact('channel', 'rental_reservations.channel'),
            // Stays overlapping [from, to]: a calendar/period view shows
            // everyone present in the window, not just those arriving.
            AllowedFilter::callback('from', fn ($query, $value) => $query->where('rental_reservations.check_out_date', '>=', (string) $value)),
            AllowedFilter::callback('to', fn ($query, $value) => $query->where('rental_reservations.check_in_date', '<=', (string) $value)),
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where(fn ($inner) => $inner
                    ->where('rental_reservations.guest_name', 'like', "%{$value}%")
                    ->orWhere('rental_reservations.guest_phone', 'like', "%{$value}%")
                    ->orWhere('properties.title', 'like', "%{$value}%"));
            }),
        ];
    }

    protected function allowedSorts(): array
    {
        return [$this->sort('check_in_date'), $this->sort('check_out_date'), $this->sort('created_at')];
    }
}
