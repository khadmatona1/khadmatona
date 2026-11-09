<?php

namespace App\Modules\Rental\Infrastructure\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\DB;

/** Limit all rental back-office queries, including aggregates and route binding. */
class SeniorRentalScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $request = request();
        $user = $request->user();
        // Resolve context for each query; never retain a user's scope in model state.
        if (! $request->routeIs('rental.*') || ! $user || $user->hasRole('Admin') || ! $user->hasAnyRole(['SeniorCommercial', 'Commercial'])) {
            return;
        }

        $builder->whereIn($model->qualifyColumn('property_id'), DB::table('properties')
            ->select('id')->where('commercial_id', $user->id)->whereNull('deleted_at'));
    }
}
