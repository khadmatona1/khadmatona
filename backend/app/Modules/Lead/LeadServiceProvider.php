<?php

namespace App\Modules\Lead;

use App\Modules\Lead\Application\Console\NotifyDueCallbacks;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Lead\Http\Policies\LeadPolicy;
use App\Modules\Lead\Infrastructure\Reports\LeadActivityReportSource;
use App\Modules\Lead\Infrastructure\Repositories\EloquentLeadRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class LeadServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(LeadActivityReportSource::class);
        $this->app->tag([LeadActivityReportSource::class], 'activity-report-sources');

        $this->app->bind(LeadRepositoryInterface::class, EloquentLeadRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        Gate::policy(Lead::class, LeadPolicy::class);

        if ($this->app->runningInConsole()) {
            $this->commands([NotifyDueCallbacks::class]);
        }

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.

        // Public, unauthenticated capture endpoint - stricter than reads
        // (PROJECT_RULES.md §22), same pattern as CoreAuthServiceProvider's
        // 'auth' limiter.
        RateLimiter::for('leads', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
