<?php

namespace App\Modules\Property\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Enums\PropertyStatus;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class EloquentPropertyRepository extends BaseRepository implements PropertyRepositoryInterface
{
    /**
     * Every route that returns a PropertyResource needs city/district/media
     * eager-loaded - PropertyResource::toArray() reads all three - so this
     * is centralized here rather than repeated with ->with() in every
     * controller method that touches a Property.
     *
     * @var array<int, string>
     */
    private const EAGER_LOADS = ['city', 'district', 'media'];

    protected function model(): string
    {
        return Property::class;
    }

    public function find(int|string $id): ?Model
    {
        return Property::with(self::EAGER_LOADS)->find($id);
    }

    public function findOrFail(int|string $id): Model
    {
        return Property::with(self::EAGER_LOADS)->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Property::with(self::EAGER_LOADS)->paginate($perPage);
    }

    public function paginateForOwner(int $ownerContactId, int $perPage = 15): LengthAwarePaginator
    {
        return Property::with(self::EAGER_LOADS)
            ->where('owner_contact_id', $ownerContactId)
            ->latest()
            ->paginate($perPage);
    }

    public function dashboardStats(): array
    {
        $now = Carbon::now();

        $rawCounts = Property::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        // Every status key is present even at zero, so the frontend never
        // has to guess at a missing key.
        $statusCounts = collect(PropertyStatus::cases())
            ->mapWithKeys(fn (PropertyStatus $status) => [
                $status->value => (int) ($rawCounts[$status->value] ?? 0),
            ])
            ->all();

        $newThisMonth = Property::query()
            ->whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)
            ->count();

        // Approximation: the properties table has no dedicated "sold_at"/
        // "rented_at" column, so "this month's revenue" is read off
        // `updated_at` for properties currently marked sold/rented - the
        // best signal available without a dedicated transactions table.
        // Any unrelated edit to an already-sold property this month (e.g.
        // fixing a typo) would also bump this figure.
        $revenueThisMonth = (int) Property::query()
            ->whereIn('status', [PropertyStatus::Vendu->value, PropertyStatus::Loue->value])
            ->whereYear('updated_at', $now->year)
            ->whereMonth('updated_at', $now->month)
            ->sum('price');

        $monthlyTrend = collect(range(5, 0))
            ->map(function (int $monthsAgo) use ($now) {
                $month = $now->copy()->subMonths($monthsAgo);

                return [
                    'month' => $month->format('Y-m'),
                    'count' => Property::query()
                        ->whereYear('created_at', $month->year)
                        ->whereMonth('created_at', $month->month)
                        ->count(),
                ];
            })
            ->values()
            ->all();

        return [
            'status_counts' => $statusCounts,
            'new_this_month' => $newThisMonth,
            'revenue_this_month' => $revenueThisMonth,
            'monthly_trend' => $monthlyTrend,
        ];
    }

    public function titlesByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return Property::withTrashed()
            ->whereIn('id', $ids)
            ->pluck('title', 'id')
            ->map(fn ($title) => (string) $title)
            ->all();
    }
}
