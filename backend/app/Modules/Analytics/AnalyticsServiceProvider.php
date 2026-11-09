<?php

namespace App\Modules\Analytics;

use App\Modules\Analytics\Application\Console\PruneAnalyticsCommand;
use App\Modules\Analytics\Domain\Contracts\AnalyticsReportRepositoryInterface;
use App\Modules\Analytics\Domain\Contracts\AnalyticsTrackingRepositoryInterface;
use App\Modules\Analytics\Domain\Contracts\GeoResolverInterface;
use App\Modules\Analytics\Http\Requests\CollectRequest;
use App\Modules\Analytics\Infrastructure\Geo\HeaderGeoResolver;
use App\Modules\Analytics\Infrastructure\Repositories\EloquentAnalyticsReportRepository;
use App\Modules\Analytics\Infrastructure\Repositories\EloquentAnalyticsTrackingRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Visitor Analytics / User Journey Tracking.
 *
 * Privacy posture:
 *  - Visitors are identified by random tracker-generated ids only.
 *  - No raw IP address is stored. The IP is used for rate limiting only.
 *  - Referrers are reduced to their host, and paths lose their query string.
 *  - Forms report field NAMES only, never values. A form's content is only
 *    ever stored by its own business module (Lead, Visit, ...) on submit.
 *  - Raw rows are deleted after config('analytics.retention_days').
 *
 * Observes the Lead/Visit/Property flows without changing them. The only
 * cross-module reads go through LeadRepositoryInterface and
 * PropertyRepositoryInterface (PROJECT_RULES.md §3).
 */
class AnalyticsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AnalyticsTrackingRepositoryInterface::class, EloquentAnalyticsTrackingRepository::class);
        $this->app->bind(AnalyticsReportRepositoryInterface::class, EloquentAnalyticsReportRepository::class);
        $this->app->bind(GeoResolverInterface::class, HeaderGeoResolver::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        if ($this->app->runningInConsole()) {
            $this->commands([PruneAnalyticsCommand::class]);
        }

        // Keyed per anonymous visitor so visitors behind one shared
        // NAT/proxy address are not throttled together, plus a much higher
        // per-IP ceiling so rotating visitor ids from one source can't
        // flood the endpoint either.
        RateLimiter::for('analytics', function (Request $request) {
            // Beacons arrive as text/plain JSON, which isn't parsed into
            // input yet at this point in the middleware stack.
            $visitor = $request->isJson()
                ? $request->input('visitor_id', '')
                : (CollectRequest::decodeBody($request->getContent())['visitor_id'] ?? '');
            $visitor = is_string($visitor) ? $visitor : '';

            return [
                Limit::perMinute((int) config('analytics.rate_limit_per_visitor'))->by('analytics-v:'.mb_substr($visitor, 0, 64)),
                Limit::perMinute((int) config('analytics.rate_limit_per_ip'))->by('analytics-ip:'.$request->ip()),
            ];
        });

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
