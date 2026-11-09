<?php

namespace App\Modules\Visit\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;

interface VisitRepositoryInterface extends RepositoryInterface
{
    /**
     * "Visites réalisées" per property, for the Owner Portal - only
     * status=Completed counts.
     *
     * @param  array<int, int>  $propertyIds
     * @return array<int, int> Keyed by property id.
     */
    public function countCompletedByPropertyIds(array $propertyIds): array;

    /**
     * @param  array<int, int>  $propertyIds
     * @return array<int, array{month: string, count: int}>
     */
    public function monthlyCompletedCountsForPropertyIds(array $propertyIds, int $months = 12): array;
}
