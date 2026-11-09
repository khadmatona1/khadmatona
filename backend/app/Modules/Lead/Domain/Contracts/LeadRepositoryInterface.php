<?php

namespace App\Modules\Lead\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use Carbon\CarbonInterface;

interface LeadRepositoryInterface extends RepositoryInterface
{
    /**
     * "Nombre de demandes" per property, for the Owner Portal.
     *
     * @param  array<int, int>  $propertyIds
     * @return array<int, int> Keyed by property id.
     */
    public function countByPropertyIds(array $propertyIds): array;

    /**
     * @param  array<int, int>  $propertyIds
     * @return array<int, array{month: string, count: int}>
     */
    public function monthlyCountsForPropertyIds(array $propertyIds, int $months = 12): array;

    /**
     * Leads created in the window ("Leads generated", visitor analytics).
     */
    public function countCreatedBetween(CarbonInterface $from, CarbonInterface $to): int;

    /**
     * Leads created in the window, bucketed by UTC hour. Callers regroup the
     * buckets into their own timezone's calendar days.
     *
     * @return array<string, int> Keyed by UTC "Y-m-d H".
     */
    public function hourlyCountsBetween(CarbonInterface $from, CarbonInterface $to): array;

    /**
     * @param  array<int, int>  $propertyIds
     * @return array<int, int> Keyed by property id.
     */
    public function countByPropertyIdsBetween(array $propertyIds, CarbonInterface $from, CarbonInterface $to): array;
}
