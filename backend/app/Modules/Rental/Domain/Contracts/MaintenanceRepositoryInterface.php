<?php

namespace App\Modules\Rental\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;

/**
 * A maintenance cost counts once the request is resolved, on its
 * resolution date.
 */
interface MaintenanceRepositoryInterface extends RentalCostRepositoryInterface, RepositoryInterface
{
    /**
     * @return array{open: int, urgent: int}
     */
    public function openCounts(): array;
}
