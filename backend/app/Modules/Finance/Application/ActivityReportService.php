<?php

namespace App\Modules\Finance\Application;

use App\Models\User;

class ActivityReportService
{
    public function __construct(private readonly iterable $sources) {}

    public function report(array $filters): array
    {
        $empty = ['leads' => 0, 'visits' => 0, 'visits_completed' => 0, 'tasks' => 0, 'tasks_completed' => 0];
        $totals = $empty;
        $rows = [];
        foreach ($this->sources as $source) {
            foreach ($source->counts($filters['from'], $filters['to'], isset($filters['commercial_id']) ? (int) $filters['commercial_id'] : null) as $counts) {
                $id = $counts['commercial_id'] ?? 0;
                $rows[$id] ??= ['id' => $counts['commercial_id'], ...$empty];
                foreach ($empty as $metric => $zero) {
                    $totals[$metric] += $counts[$metric] ?? 0;
                    $rows[$id][$metric] += $counts[$metric] ?? 0;
                }
            }
        }
        $names = User::whereIn('id', array_keys($rows))->pluck('name', 'id');
        foreach ($rows as $id => &$row) {
            $row['name'] = $names[$id] ?? null;
        }
        unset($row);

        return ['from' => $filters['from'], 'to' => $filters['to'], 'totals' => $totals, 'commercials' => array_values($rows)];
    }
}
