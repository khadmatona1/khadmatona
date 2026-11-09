<?php

namespace App\Modules\PropertyAlert;

use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\PropertyAlert\Application\Listeners\DispatchPropertyAlertMatching;
use App\Modules\PropertyAlert\Domain\Contracts\PropertyAlertRepositoryInterface;
use App\Modules\PropertyAlert\Infrastructure\Repositories\EloquentPropertyAlertRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class PropertyAlertServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PropertyAlertRepositoryInterface::class, EloquentPropertyAlertRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // No Gate::policy() - alerts have no per-instance ownership
        // concept, Admin-only via role:Admin route middleware.

        Event::listen(PropertyApproved::class, DispatchPropertyAlertMatching::class);

        // Public, unauthenticated capture endpoint - stricter than reads
        // (PROJECT_RULES.md §22), same pattern as Lead/CommercialLead.
        RateLimiter::for('property-alerts', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
