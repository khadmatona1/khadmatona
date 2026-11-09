<?php

namespace App\Modules\Rental\Http\Filters;

use App\Modules\Rental\Domain\Models\MaintenanceRequest;
use Spatie\QueryBuilder\AllowedFilter;

class MaintenanceFilter extends RentalFilter
{
    protected function model(): string
    {
        return MaintenanceRequest::class;
    }

    protected function table(): string
    {
        return 'rental_maintenance_requests';
    }

    protected function allowedFilters(): array
    {
        return [
            ...$this->commonFilters(),
            ...$this->dateRangeFilters('reported_on'),
            AllowedFilter::exact('status', 'rental_maintenance_requests.status'),
            AllowedFilter::exact('priority', 'rental_maintenance_requests.priority'),
        ];
    }

    protected function allowedSorts(): array
    {
        return [$this->sort('reported_on'), $this->sort('priority'), $this->sort('created_at')];
    }
}
