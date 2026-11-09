<?php

namespace App\Modules\Rental\Domain\Contracts;

use Carbon\CarbonInterface;

/**
 * Shared by every cost source (cleanings, maintenance, other expenses) so
 * statements sum them the same way.
 */
interface RentalCostRepositoryInterface
{
    /**
     * Costs counted in [from, to], per catalog property and payer.
     *
     * @param  array<int, int>|null  $propertyIds
     * @return array<int, array{owner: int, khadmatona: int}> Keyed by property_id, cents.
     */
    public function costsByProperty(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds = null): array;

    /**
     * The individual cost lines behind costsByProperty(), for statements.
     *
     * @param  array<int, int>|null  $propertyIds
     * @return array<int, array{property_id: int, source: string, category: string, label: string, date: string, amount: int, charged_to: string}>
     */
    public function costLines(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds = null): array;
}
