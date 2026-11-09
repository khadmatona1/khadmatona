<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// The "À rappeler" timer: every minute, notify the responsible commercial of
// leads whose scheduled callback time has arrived. Needs the scheduler
// running (`artisan schedule:work` - a supervisor program in the Docker
// setup, a `* * * * * artisan schedule:run` cron entry in production).
Schedule::command('leads:notify-callbacks')->everyMinute()->withoutOverlapping();

// Visitor analytics retention: drops rows older than
// config('analytics.retention_days'), off-peak.
Schedule::command('analytics:prune')->dailyAt('03:30')->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
