<?php

namespace App\Modules\Rental\Domain\Models\Concerns;

use App\Modules\Rental\Infrastructure\Scopes\SeniorRentalScope;

trait ScopesSeniorRentals
{
    protected static function bootScopesSeniorRentals(): void
    {
        static::addGlobalScope(new SeniorRentalScope);
    }
}
