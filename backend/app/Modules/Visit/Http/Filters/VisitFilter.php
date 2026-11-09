<?php

namespace App\Modules\Visit\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedSort;

/**
 * Denormalized display columns (property_title, lead_name, lead_email,
 * lead_phone) are attached via a raw SQL join, aliased so they never
 * collide with `visits`' own columns - the sanctioned "shared table query"
 * escape hatch (PROJECT_RULES.md §3), not a cross-module Eloquent relation.
 * Every column that also exists on `leads`/`properties` (status,
 * commercial_id, property_id, scheduled_at/created_at) MUST stay qualified
 * with `visits.` everywhere below, or the join makes it ambiguous.
 */
class VisitFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        $query = Visit::query()
            ->select('visits.*')
            ->with('commercial')
            ->leftJoin('properties', 'properties.id', '=', 'visits.property_id')
            ->addSelect('properties.title as property_title')
            ->leftJoin('leads', 'leads.id', '=', 'visits.lead_id')
            ->addSelect('leads.name as lead_name', 'leads.email as lead_email', 'leads.phone as lead_phone');

        // Every route this filter serves sits behind auth:sanctum +
        // role:Admin|Commercial|SeniorCommercial, so $user is always one of
        // those roles in practice - the final branch is defense-in-depth
        // only. Admin sees every visit; Commercial/SeniorCommercial sees
        // only visits currently assigned to them (Visit.commercial_id is
        // the mutable, real source of truth - never Lead's frozen copy).
        $user = $this->request->user();

        if ($user?->hasRole('Admin')) {
            return $query;
        }

        if ($user?->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            return $query->where('visits.commercial_id', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            AllowedFilter::exact('status', 'visits.status'),
            AllowedFilter::exact('commercial_id', 'visits.commercial_id'),
            AllowedFilter::exact('property_id', 'visits.property_id'),
            AllowedFilter::callback('from', function ($query, $value) {
                $query->where('visits.scheduled_at', '>=', $value);
            }),
            AllowedFilter::callback('to', function ($query, $value) {
                $query->where('visits.scheduled_at', '<=', $value);
            }),
        ];
    }

    /**
     * @return array<int, string|AllowedSort>
     */
    protected function allowedSorts(): array
    {
        return [
            AllowedSort::field('scheduled_at', 'visits.scheduled_at'),
            AllowedSort::field('created_at', 'visits.created_at'),
        ];
    }
}
