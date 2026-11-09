<?php

namespace App\Modules\Contact\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\Contact\Domain\Models\Contact;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\AllowedFilter;

class ContactFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        $query = Contact::query();

        // Every route this filter serves sits behind auth:sanctum +
        // role:Admin|Commercial|SeniorCommercial, so $user is always one of
        // those roles in practice - the final branch is defense-in-depth
        // only, in case this filter is ever reused somewhere less
        // restricted. Admin sees every contact; Commercial/SeniorCommercial
        // sees only their own.
        $user = $this->request->user();

        if ($user?->hasRole('Admin')) {
            return $query;
        }

        if ($user?->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            return $query->where('commercial_id', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            'type',
            'commercial_id',
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where(function ($query) use ($value) {
                    $query->where('name', 'like', "%{$value}%")
                        ->orWhere('email', 'like', "%{$value}%")
                        ->orWhere('phone', 'like', "%{$value}%");
                });
            }),
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function allowedSorts(): array
    {
        return ['created_at', 'name'];
    }
}
