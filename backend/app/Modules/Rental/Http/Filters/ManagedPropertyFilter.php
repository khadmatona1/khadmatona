<?php

namespace App\Modules\Rental\Http\Filters;

use App\Modules\Rental\Domain\Models\ManagedProperty;
use Spatie\QueryBuilder\AllowedFilter;

class ManagedPropertyFilter extends RentalFilter
{
    protected function model(): string
    {
        return ManagedProperty::class;
    }

    protected function table(): string
    {
        return 'rental_properties';
    }

    protected function allowedFilters(): array
    {
        return [
            AllowedFilter::exact('property_id', 'rental_properties.property_id'),
            AllowedFilter::exact('is_active', 'rental_properties.is_active'),
            AllowedFilter::callback('search', fn ($query, $value) => $query->where('properties.title', 'like', "%{$value}%")),
        ];
    }

    protected function allowedSorts(): array
    {
        return [$this->sort('created_at'), $this->sort('property_id')];
    }
}
