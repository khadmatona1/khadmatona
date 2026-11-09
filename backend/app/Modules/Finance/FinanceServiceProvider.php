<?php

namespace App\Modules\Finance;

use App\Modules\Finance\Application\ActivityReportService;
use App\Modules\Finance\Domain\Contracts\FinanceRepository;
use App\Modules\Finance\Infrastructure\Repositories\EloquentFinanceRepository;
use Illuminate\Support\ServiceProvider;

class FinanceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ActivityReportService::class, fn ($app) => new ActivityReportService($app->tagged('activity-report-sources')));
        $this->app->bind(FinanceRepository::class, EloquentFinanceRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
