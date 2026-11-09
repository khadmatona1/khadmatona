<?php

namespace App\Core\Lookup\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

interface DistrictRepositoryInterface extends RepositoryInterface
{
    /**
     * Districts for a given city, translations eager-loaded. Returns all
     * districts (translations eager-loaded) when $cityId is null.
     */
    public function allWithTranslations(?int $cityId = null): Collection;
}
