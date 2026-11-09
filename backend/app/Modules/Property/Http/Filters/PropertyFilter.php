<?php

namespace App\Modules\Property\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\Property\Domain\Enums\PropertyApprovalStatus;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\AllowedFilter;

class PropertyFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        // PropertyResource/DashboardPropertyResource always read
        // city/district/media(/commercial) - eager-loaded here so the list
        // endpoint never N+1s (mirrors EloquentPropertyRepository's
        // find()/findOrFail() overrides, which cover the non-list
        // endpoints this filter doesn't touch).
        $query = Property::query()->with(['city', 'district', 'media', 'commercial']);

        // Row-level ownership scoping, shared by the public route (guest,
        // via PropertyController's own belt-and-suspenders approved-only
        // constraint on top of this) and the authenticated dashboard route
        // (guaranteed a real user, since that route sits behind
        // auth:sanctum). Admin sees everything; a Commercial/SeniorCommercial
        // sees every status of only their own rows (SeniorCommercial's rows
        // just happen to always be approved, since they skip the review
        // queue - see PropertyController::applyOwnership()); an Owner
        // (Espace Propriétaire, read-only) sees every status of only the
        // property/properties they own; anyone else only ever sees
        // published listings.
        $user = $this->request->user();

        if ($user?->hasRole('Admin')) {
            return $query;
        }

        if ($user?->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            return $query->where('commercial_id', $user->id);
        }

        if ($user?->hasRole('Owner')) {
            return $query->where('owner_contact_id', $user->contact_id);
        }

        return $query->where('approval_status', PropertyApprovalStatus::Approved->value);
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            'status',
            AllowedFilter::exact('transaction_type'),
            AllowedFilter::exact('price_period'),
            'approval_status',
            'type',
            'city_id',
            'district_id',
            'owner_contact_id',
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where('title', 'like', "%{$value}%");
            }),
            // Values arrive in MAD (the API's public unit - see
            // PropertyResource/PropertyController::toAttributes()) and are
            // converted to cents here to match the stored column.
            AllowedFilter::callback('price_min', function ($query, $value) {
                $query->where('price', '>=', (int) round($value * 100));
            }),
            AllowedFilter::callback('price_max', function ($query, $value) {
                $query->where('price', '<=', (int) round($value * 100));
            }),
            // surface is a plain integer column - no unit conversion needed
            // (unlike price's MAD/cents boundary).
            AllowedFilter::callback('surface_min', function ($query, $value) {
                $query->where('surface', '>=', (int) $value);
            }),
            AllowedFilter::callback('surface_max', function ($query, $value) {
                $query->where('surface', '<=', (int) $value);
            }),
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function allowedSorts(): array
    {
        return ['created_at', 'price'];
    }
}
