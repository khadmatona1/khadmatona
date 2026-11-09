<?php

namespace App\Modules\Rental\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;

/**
 * An expense counts on the day it was incurred.
 */
interface ExpenseRepositoryInterface extends RentalCostRepositoryInterface, RepositoryInterface {}
