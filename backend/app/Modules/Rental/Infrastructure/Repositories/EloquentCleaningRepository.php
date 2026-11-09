<?php

namespace App\Modules\Rental\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Rental\Domain\Contracts\CleaningRepositoryInterface;
use App\Modules\Rental\Domain\Enums\CleaningStatus;
use App\Modules\Rental\Domain\Models\Cleaning;
use App\Modules\Rental\Infrastructure\Repositories\Concerns\SumsCostsByProperty;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class EloquentCleaningRepository extends BaseRepository implements CleaningRepositoryInterface
{
    use SumsCostsByProperty;

    protected function model(): string
    {
        return Cleaning::class;
    }

    public function pendingUntil(CarbonInterface $until, int $limit = 20): Collection
    {
        return Cleaning::query()
            ->where('status', CleaningStatus::Pending->value)
            ->where('scheduled_for', '<=', $until->toDateString())
            ->orderBy('scheduled_for')
            ->limit($limit)
            ->get();
    }

    public function countPending(): int
    {
        return Cleaning::query()->where('status', CleaningStatus::Pending->value)->count();
    }

    protected function costQuery(): Builder
    {
        return Cleaning::query()->where('status', CleaningStatus::Done->value);
    }

    protected function costDateColumn(): string
    {
        return 'scheduled_for';
    }

    protected function costDateIsTimestamp(): bool
    {
        return false;
    }

    protected function costAmountColumn(): string
    {
        return 'cost';
    }

    protected function describeCost(object $row): array
    {
        return ['source' => 'cleaning', 'category' => 'cleaning', 'label' => (string) ($row->cleaner_name ?? '')];
    }
}
