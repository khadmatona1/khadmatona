<?php

namespace App\Modules\Lead\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Lead\Domain\Models\Lead;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class EloquentLeadRepository extends BaseRepository implements LeadRepositoryInterface
{
    protected function model(): string
    {
        return Lead::class;
    }

    public function countByPropertyIds(array $propertyIds): array
    {
        if ($propertyIds === []) {
            return [];
        }

        return Lead::query()
            ->whereIn('property_id', $propertyIds)
            ->selectRaw('property_id, count(*) as aggregate')
            ->groupBy('property_id')
            ->pluck('aggregate', 'property_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    public function monthlyCountsForPropertyIds(array $propertyIds, int $months = 12): array
    {
        if ($propertyIds === []) {
            return collect(range($months - 1, 0))
                ->map(fn (int $monthsAgo) => ['month' => Carbon::now()->subMonths($monthsAgo)->format('Y-m'), 'count' => 0])
                ->values()
                ->all();
        }

        $now = Carbon::now();

        // Mirrors EloquentPropertyRepository::dashboardStats()'s monthly_trend
        // computation shape exactly.
        return collect(range($months - 1, 0))
            ->map(function (int $monthsAgo) use ($now, $propertyIds) {
                $month = $now->copy()->subMonths($monthsAgo);

                return [
                    'month' => $month->format('Y-m'),
                    'count' => Lead::query()
                        ->whereIn('property_id', $propertyIds)
                        ->whereYear('created_at', $month->year)
                        ->whereMonth('created_at', $month->month)
                        ->count(),
                ];
            })
            ->values()
            ->all();
    }

    public function countCreatedBetween(CarbonInterface $from, CarbonInterface $to): int
    {
        return Lead::query()->whereBetween('created_at', [$from, $to])->count();
    }

    public function hourlyCountsBetween(CarbonInterface $from, CarbonInterface $to): array
    {
        return Lead::query()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m-%d %H') as hour, count(*) as aggregate")
            ->groupBy('hour')
            ->pluck('aggregate', 'hour')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    public function countByPropertyIdsBetween(array $propertyIds, CarbonInterface $from, CarbonInterface $to): array
    {
        if ($propertyIds === []) {
            return [];
        }

        return Lead::query()
            ->whereIn('property_id', $propertyIds)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('property_id, count(*) as aggregate')
            ->groupBy('property_id')
            ->pluck('aggregate', 'property_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }
}
