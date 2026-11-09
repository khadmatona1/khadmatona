<?php

namespace App\Modules\Task\Http\Controllers;

use App\Modules\Task\Domain\Models\WeeklyReport;
use Carbon\CarbonImmutable;

class WeeklyReportController extends DailyReportController
{
    protected string $reportModel = WeeklyReport::class;

    protected function normalizeDate(string $date): string
    {
        return CarbonImmutable::parse($date)->startOfWeek(CarbonImmutable::MONDAY)->toDateString();
    }
}
