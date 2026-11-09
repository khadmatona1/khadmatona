<?php

namespace App\Modules\CommercialLead;

use App\Modules\CommercialLead\Domain\Contracts\CommercialLeadRepositoryInterface;
use App\Modules\CommercialLead\Infrastructure\Repositories\EloquentCommercialLeadRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class CommercialLeadServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CommercialLeadRepositoryInterface::class, EloquentCommercialLeadRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.

        // Public, unauthenticated capture endpoint - stricter than reads
        // (PROJECT_RULES.md §22), same pattern as Lead's own 'leads' limiter.
        RateLimiter::for('commercial-leads', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
