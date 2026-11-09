<?php

namespace App\Modules\Rental\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\Rental\Domain\Models\ManagedProperty;

interface ManagedPropertyRepositoryInterface extends RepositoryInterface
{
    public function lock(int $id): ManagedProperty;

    public function activePropertyIds(): array;

    /** The management contract of a catalog property, soft-deleted ones included. */
    public function findByPropertyIdWithTrashed(int $propertyId): ?ManagedProperty;

    public function restore(ManagedProperty $managedProperty): ManagedProperty;

    /**
     * Managed properties (optionally limited to some catalog property ids),
     * inactive ones included, for statements.
     *
     * @param  array<int, int>|null  $propertyIds
     * @return array<int, array{rental_property_id: int, property_id: int, commission_rate_bp: int, is_active: bool}>
     */
    public function forStatements(?array $propertyIds = null): array;

    public function countActive(): int;
}
