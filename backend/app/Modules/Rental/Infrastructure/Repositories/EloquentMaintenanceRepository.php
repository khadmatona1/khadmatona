<?php

namespace App\Modules\Rental\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Rental\Domain\Contracts\MaintenanceRepositoryInterface;
use App\Modules\Rental\Domain\Enums\MaintenancePriority;
use App\Modules\Rental\Domain\Enums\MaintenanceStatus;
use App\Modules\Rental\Domain\Models\MaintenanceRequest;
use App\Modules\Rental\Infrastructure\Repositories\Concerns\SumsCostsByProperty;
use Illuminate\Database\Eloquent\Builder;

class EloquentMaintenanceRepository extends BaseRepository implements MaintenanceRepositoryInterface
{
    use SumsCostsByProperty;

    protected function model(): string
    {
        return MaintenanceRequest::class;
    }

    public function openCounts(): array
    {
        $row = MaintenanceRequest::query()
            ->whereIn('status', [MaintenanceStatus::Open->value, MaintenanceStatus::InProgress->value])
            ->toBase()
            ->selectRaw('count(*) as open, sum(case when priority = ? then 1 else 0 end) as urgent', [MaintenancePriority::Urgent->value])
            ->first();

        return ['open' => (int) $row->open, 'urgent' => (int) $row->urgent];
    }

    protected function costQuery(): Builder
    {
        return MaintenanceRequest::query()->where('status', MaintenanceStatus::Resolved->value);
    }

    protected function costDateColumn(): string
    {
        return 'resolved_at';
    }

    protected function costDateIsTimestamp(): bool
    {
        return true;
    }

    protected function costAmountColumn(): string
    {
        return 'cost';
    }

    protected function describeCost(object $row): array
    {
        return ['source' => 'maintenance', 'category' => 'maintenance', 'label' => (string) $row->title];
    }
}
