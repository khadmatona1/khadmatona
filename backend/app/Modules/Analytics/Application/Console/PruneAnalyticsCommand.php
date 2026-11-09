<?php

namespace App\Modules\Analytics\Application\Console;

use App\Modules\Analytics\Domain\Contracts\AnalyticsTrackingRepositoryInterface;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Data retention: deletes analytics rows older than
 * config('analytics.retention_days'). Scheduled daily in routes/console.php.
 */
class PruneAnalyticsCommand extends Command
{
    protected $signature = 'analytics:prune {--days= : Override the configured retention period}';

    protected $description = 'Delete visitor analytics data older than the retention period';

    public function handle(AnalyticsTrackingRepositoryInterface $tracking): int
    {
        $days = (int) ($this->option('days') ?: config('analytics.retention_days'));

        if ($days < 1) {
            $this->error('The retention period must be at least 1 day.');

            return self::FAILURE;
        }

        $deleted = $tracking->pruneOlderThan(CarbonImmutable::now()->subDays($days));

        $this->info("Deleted {$deleted} analytics sessions older than {$days} days.");

        return self::SUCCESS;
    }
}
