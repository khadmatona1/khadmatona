<?php

namespace App\Core\Auth\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\AllowedFilter;

class UserFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        return User::query()->with('roles');
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            // One or several roles: filter[role]=Commercial or
            // filter[role]=Commercial,SeniorCommercial (the property form's
            // assignment picker). Not Spatie's role() scope via
            // AllowedFilter::scope(): that spread "A,B" into role('A', 'B'),
            // reading the second role as a guard name (500), and an unknown
            // role name also threw RoleDoesNotExist (500) instead of simply
            // matching nobody.
            AllowedFilter::callback('role', function ($query, $value) {
                $query->whereHas('roles', fn ($roles) => $roles->whereIn('name', (array) $value));
            }),
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where(function ($query) use ($value) {
                    $query->where('name', 'like', "%{$value}%")
                        ->orWhere('email', 'like', "%{$value}%");
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
