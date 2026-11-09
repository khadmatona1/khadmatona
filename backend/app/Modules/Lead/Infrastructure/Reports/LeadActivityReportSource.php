<?php

namespace App\Modules\Lead\Infrastructure\Reports;

use App\Core\Support\Contracts\ActivityReportSource;
use App\Modules\Lead\Domain\Models\Lead;
use Carbon\CarbonImmutable;

class LeadActivityReportSource implements ActivityReportSource
{
    public function counts(string $from, string $to, ?int $commercialId): array
    {
        $start = CarbonImmutable::parse($from, 'Africa/Casablanca')->startOfDay()->utc();
        $end = CarbonImmutable::parse($to, 'Africa/Casablanca')->endOfDay()->utc();
        $query = Lead::query()->whereBetween('created_at', [$start, $end])
            ->when($commercialId, fn ($q, $id) => $q->where('commercial_id', $id));

        // Group in SQL; never load all lead or task contents for reporting.
        return $query->selectRaw('commercial_id as commercial_id, COUNT(*) as leads')
            ->groupBy('commercial_id')->get()->map(fn ($row) => [
                'commercial_id' => $row->commercial_id, 'leads' => (int) $row->leads,

            ])->all();
    }
}
