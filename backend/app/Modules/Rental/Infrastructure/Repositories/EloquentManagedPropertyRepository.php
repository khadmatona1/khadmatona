<?php

namespace App\Modules\Rental\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Models\ManagedProperty;

class EloquentManagedPropertyRepository extends BaseRepository implements ManagedPropertyRepositoryInterface
{
    public function lock(int $id): ManagedProperty
    {
        return ManagedProperty::query()->lockForUpdate()->findOrFail($id);
    }

    public function activePropertyIds(): array
    {
        return ManagedProperty::query()->where('is_active', true)->pluck('property_id')->all();
    }

    protected function model(): string
    {
        return ManagedProperty::class;
    }

    public function findByPropertyIdWithTrashed(int $propertyId): ?ManagedProperty
    {
        return ManagedProperty::withTrashed()->where('property_id', $propertyId)->first();
    }

    public function restore(ManagedProperty $managedProperty): ManagedProperty
    {
        $managedProperty->restore();

        return $managedProperty;
    }

    public function forStatements(?array $propertyIds = null): array
    {
        return ManagedProperty::query()
            ->when($propertyIds !== null, fn ($query) => $query->whereIn('property_id', $propertyIds))
            ->orderBy('property_id')
            ->get(['id', 'property_id', 'commission_rate_bp', 'is_active'])
            ->map(fn (ManagedProperty $managed) => [
                'rental_property_id' => $managed->id,
                'property_id' => $managed->property_id,
                'commission_rate_bp' => $managed->commission_rate_bp,
                'is_active' => $managed->is_active,
            ])
            ->all();
    }

    public function countActive(): int
    {
        return ManagedProperty::query()->where('is_active', true)->count();
    }
}
