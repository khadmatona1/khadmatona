<?php

namespace App\Core\Lookup\Infrastructure\Repositories;

use App\Core\Lookup\Domain\Contracts\DistrictRepositoryInterface;
use App\Core\Lookup\Domain\Models\District;
use App\Core\Support\Repositories\BaseRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class EloquentDistrictRepository extends BaseRepository implements DistrictRepositoryInterface
{
    protected function model(): string
    {
        return District::class;
    }

    /**
     * Cached per city (or the "all districts" case when $cityId is null) -
     * same rationale as EloquentCityRepository::allWithTranslations(): no
     * write endpoint exists for districts anywhere in the app.
     */
    public function allWithTranslations(?int $cityId = null): Collection
    {
        return Cache::remember(
            'districts.all.'.($cityId ?? 'none'),
            now()->addHour(),
            fn () => District::query()
                ->with('translations')
                ->when($cityId !== null, fn ($query) => $query->where('city_id', $cityId))
                ->orderBy('id')
                ->get(),
        );
    }
}
