<?php

namespace App\Modules\Property;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Property\Http\Policies\PropertyPolicy;
use App\Modules\Property\Infrastructure\Repositories\EloquentPropertyDirectory;
use App\Modules\Property\Infrastructure\Repositories\EloquentPropertyRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class PropertyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PropertyDirectory::class, EloquentPropertyDirectory::class);
        $this->app->bind(PropertyRepositoryInterface::class, EloquentPropertyRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        Gate::policy(Property::class, PropertyPolicy::class);

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.

        // The public showcase site reads listings/details without auth
        // (PROJECT_RULES.md §22 requires throttling public endpoints).
        RateLimiter::for('public-read', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });
    }
}
