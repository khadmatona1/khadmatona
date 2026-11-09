<?php

namespace App\Modules\Rental\Http\Filters;

use App\Modules\Rental\Domain\Models\Cleaning;
use Spatie\QueryBuilder\AllowedFilter;

class CleaningFilter extends RentalFilter
{
    protected function model(): string
    {
        return Cleaning::class;
    }

    protected function table(): string
    {
        return 'rental_cleanings';
    }

    protected function allowedFilters(): array
    {
        return [
            ...$this->commonFilters(),
            ...$this->dateRangeFilters('scheduled_for'),
            AllowedFilter::exact('status', 'rental_cleanings.status'),
        ];
    }

    protected function allowedSorts(): array
    {
        return [$this->sort('scheduled_for'), $this->sort('created_at')];
    }
}
