<?php

namespace App\Core\Lookup;

use App\Core\Lookup\Domain\Contracts\CityRepositoryInterface;
use App\Core\Lookup\Domain\Contracts\DistrictRepositoryInterface;
use App\Core\Lookup\Infrastructure\Repositories\EloquentCityRepository;
use App\Core\Lookup\Infrastructure\Repositories\EloquentDistrictRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Cross-cutting reference data (cities, districts) consumed by Property
 * today and likely other modules later (Phase 2's Owner/Contract) - lives
 * in Core rather than a peer business module so those modules can safely
 * hold a real Eloquent relation to it (PROJECT_RULES.md §3 only forbids
 * business modules importing each other, not Core).
 */
class CoreLookupServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CityRepositoryInterface::class, EloquentCityRepository::class);
        $this->app->bind(DistrictRepositoryInterface::class, EloquentDistrictRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
