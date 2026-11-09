<?php

namespace App\Core\Lookup\Infrastructure\Repositories;

use App\Core\Lookup\Domain\Contracts\CityRepositoryInterface;
use App\Core\Lookup\Domain\Models\City;
use App\Core\Support\Repositories\BaseRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class EloquentCityRepository extends BaseRepository implements CityRepositoryInterface
{
    protected function model(): string
    {
        return City::class;
    }

    /**
     * Cached: cities are seeded reference data with no write endpoint
     * anywhere in the app (see Http/routes.php), and this is read on
     * nearly every public property search/filter render - no invalidation
     * needed since nothing can mutate this data through the running app.
     */
    public function allWithTranslations(): Collection
    {
        return Cache::remember(
            'cities.all',
            now()->addHour(),
            fn () => City::query()->with('translations')->orderBy('id')->get(),
        );
    }
}
