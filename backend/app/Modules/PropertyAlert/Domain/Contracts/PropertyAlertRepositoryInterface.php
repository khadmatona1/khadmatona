<?php

namespace App\Modules\PropertyAlert\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;

interface PropertyAlertRepositoryInterface extends RepositoryInterface
{
    public function findByFingerprint(string $hash): ?PropertyAlert;
}
