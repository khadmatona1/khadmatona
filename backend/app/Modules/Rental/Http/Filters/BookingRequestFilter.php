<?php

namespace App\Modules\Rental\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\Rental\Domain\Models\BookingRequest;
use Spatie\QueryBuilder\AllowedFilter;

class BookingRequestFilter extends BaseQueryFilter
{
    protected function subject(): string
    {
        return BookingRequest::class;
    }

    protected function allowedFilters(): array
    {
        return [AllowedFilter::exact('status'), AllowedFilter::exact('property_id')];
    }

    protected function allowedSorts(): array
    {
        return ['created_at', 'check_in_date'];
    }
}
