<?php

namespace App\Modules\Rental\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\Rental\Domain\Models\Cleaning;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * A cleaning's cost counts once it is done, on its scheduled date.
 */
interface CleaningRepositoryInterface extends RentalCostRepositoryInterface, RepositoryInterface
{
    /**
     * Pending cleanings scheduled up to the given day (overdue included).
     *
     * @return Collection<int, Cleaning>
     */
    public function pendingUntil(CarbonInterface $until, int $limit = 20): Collection;

    public function countPending(): int;
}
