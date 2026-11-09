<?php

namespace App\Modules\CommercialLead\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\CommercialLead\Domain\Models\CommercialLead;
use Spatie\QueryBuilder\AllowedFilter;

class CommercialLeadFilter extends BaseQueryFilter
{
    protected function subject(): string
    {
        return CommercialLead::class;
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            'professional_type',
            'status',
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where(function ($query) use ($value) {
                    $query->where('full_name', 'like', "%{$value}%")
                        ->orWhere('company_name', 'like', "%{$value}%")
                        ->orWhere('email', 'like', "%{$value}%")
                        ->orWhere('phone', 'like', "%{$value}%");
                });
            }),
            AllowedFilter::callback('city', function ($query, $value) {
                $query->where('city', 'like', "%{$value}%");
            }),
            AllowedFilter::callback('created_from', function ($query, $value) {
                $query->whereDate('created_at', '>=', $value);
            }),
            AllowedFilter::callback('created_to', function ($query, $value) {
                $query->whereDate('created_at', '<=', $value);
            }),
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function allowedSorts(): array
    {
        return ['created_at'];
    }
}
