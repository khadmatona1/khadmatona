<?php

namespace App\Core\Auth\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;

/**
 * Narrows the generic repository contract to the User aggregate so Auth's
 * Application layer depends on this interface, never on Eloquent directly.
 */
interface UserRepositoryInterface extends RepositoryInterface {}
