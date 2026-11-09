<?php

namespace App\Modules\Visit;

use App\Modules\Visit\Application\Listeners\DispatchVisitConfirmation;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\Visit\Domain\Events\VisitBooked;
use App\Modules\Visit\Domain\Models\Visit;
use App\Modules\Visit\Http\Policies\VisitPolicy;
use App\Modules\Visit\Infrastructure\Reports\VisitActivityReportSource;
use App\Modules\Visit\Infrastructure\Repositories\EloquentVisitRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class VisitServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(VisitActivityReportSource::class);
        $this->app->tag([VisitActivityReportSource::class], 'activity-report-sources');

        $this->app->bind(VisitRepositoryInterface::class, EloquentVisitRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        Gate::policy(Visit::class, VisitPolicy::class);

        Event::listen(VisitBooked::class, DispatchVisitConfirmation::class);

        // Public, unauthenticated capture endpoint - stricter than reads
        // (PROJECT_RULES.md §22), same pattern as Lead/CommercialLead/PropertyAlert.
        RateLimiter::for('visits', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
