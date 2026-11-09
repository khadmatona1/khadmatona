<?php

namespace App\Modules\Task\Infrastructure\Reports;

use App\Core\Support\Contracts\ActivityReportSource;
use App\Modules\Task\Domain\Models\TeamTask;
use Carbon\CarbonImmutable;

class TaskActivityReportSource implements ActivityReportSource
{
    public function counts(string $from, string $to, ?int $commercialId): array
    {
        $start = CarbonImmutable::parse($from, 'Africa/Casablanca')->startOfDay()->utc();
        $end = CarbonImmutable::parse($to, 'Africa/Casablanca')->endOfDay()->utc();
        $query = TeamTask::query()->whereBetween('created_at', [$start, $end])
            ->when($commercialId, fn ($q, $id) => $q->where('assignee_id', $id));

        // Group in SQL; never load all lead or task contents for reporting.
        return $query->selectRaw('assignee_id as commercial_id, COUNT(*) as tasks, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as tasks_completed', ['done'])
            ->groupBy('assignee_id')->get()->map(fn ($row) => [
                'commercial_id' => $row->commercial_id, 'tasks' => (int) $row->tasks,
                'tasks_completed' => (int) $row->tasks_completed,
            ])->all();
    }
}
