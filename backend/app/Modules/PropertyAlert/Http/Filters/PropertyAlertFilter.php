<?php

namespace App\Modules\PropertyAlert\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\AllowedFilter;

class PropertyAlertFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        // Every route this filter serves sits behind auth:sanctum +
        // role:Admin - no ownership concept exists for alerts, unlike
        // Contact/Property, so there's no row-level scoping to apply.
        return PropertyAlert::query()->with(['city', 'district']);
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            'city_id',
            AllowedFilter::callback('email', function ($query, $value) {
                $query->where('email', 'like', "%{$value}%");
            }),
            AllowedFilter::callback('phone', function ($query, $value) {
                $query->where('phone_e164', 'like', "%{$value}%");
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
