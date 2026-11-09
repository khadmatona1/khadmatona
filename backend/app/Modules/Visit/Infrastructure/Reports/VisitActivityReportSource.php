<?php

namespace App\Modules\Visit\Infrastructure\Reports;

use App\Core\Support\Contracts\ActivityReportSource;
use App\Modules\Visit\Domain\Models\Visit;
use Carbon\CarbonImmutable;

class VisitActivityReportSource implements ActivityReportSource
{
    public function counts(string $from, string $to, ?int $commercialId): array
    {
        $start = CarbonImmutable::parse($from, 'Africa/Casablanca')->startOfDay()->utc();
        $end = CarbonImmutable::parse($to, 'Africa/Casablanca')->endOfDay()->utc();
        $query = Visit::query()->whereBetween('scheduled_at', [$start, $end])
            ->when($commercialId, fn ($q, $id) => $q->where('commercial_id', $id));

        // Group in SQL; never load all lead or task contents for reporting.
        return $query->selectRaw('commercial_id as commercial_id, COUNT(*) as visits, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as visits_completed', ['completed'])
            ->groupBy('commercial_id')->get()->map(fn ($row) => [
                'commercial_id' => $row->commercial_id, 'visits' => (int) $row->visits,
                'visits_completed' => (int) $row->visits_completed,
            ])->all();
    }
}
