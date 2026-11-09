<?php

namespace App\Core\Lookup\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

interface CityRepositoryInterface extends RepositoryInterface
{
    /**
     * All cities, translations eager-loaded so CityResource::translate()
     * never N+1s.
     */
    public function allWithTranslations(): Collection;
}
