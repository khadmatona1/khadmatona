<?php

namespace App\Modules\Task;

use App\Modules\Task\Infrastructure\Reports\TaskActivityReportSource;
use Illuminate\Support\ServiceProvider;

class TaskServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(TaskActivityReportSource::class);
        $this->app->tag([TaskActivityReportSource::class], 'activity-report-sources');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
