<?php

namespace App\Modules\Visit\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\Visit\Domain\Enums\VisitStatus;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Support\Carbon;

class EloquentVisitRepository extends BaseRepository implements VisitRepositoryInterface
{
    protected function model(): string
    {
        return Visit::class;
    }

    public function countCompletedByPropertyIds(array $propertyIds): array
    {
        if ($propertyIds === []) {
            return [];
        }

        return Visit::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', VisitStatus::Completed->value)
            ->selectRaw('property_id, count(*) as aggregate')
            ->groupBy('property_id')
            ->pluck('aggregate', 'property_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    public function monthlyCompletedCountsForPropertyIds(array $propertyIds, int $months = 12): array
    {
        if ($propertyIds === []) {
            return collect(range($months - 1, 0))
                ->map(fn (int $monthsAgo) => ['month' => Carbon::now()->subMonths($monthsAgo)->format('Y-m'), 'count' => 0])
                ->values()
                ->all();
        }

        $now = Carbon::now();

        return collect(range($months - 1, 0))
            ->map(function (int $monthsAgo) use ($now, $propertyIds) {
                $month = $now->copy()->subMonths($monthsAgo);

                return [
                    'month' => $month->format('Y-m'),
                    'count' => Visit::query()
                        ->whereIn('property_id', $propertyIds)
                        ->where('status', VisitStatus::Completed->value)
                        // completed_at, not created_at/scheduled_at - the
                        // report is "visits that happened this month", not
                        // "visits booked this month".
                        ->whereYear('completed_at', $month->year)
                        ->whereMonth('completed_at', $month->month)
                        ->count(),
                ];
            })
            ->values()
            ->all();
    }
}
