<?php

namespace App\Modules\PropertyAlert\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\PropertyAlert\Domain\Contracts\PropertyAlertRepositoryInterface;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;

class EloquentPropertyAlertRepository extends BaseRepository implements PropertyAlertRepositoryInterface
{
    protected function model(): string
    {
        return PropertyAlert::class;
    }

    public function findByFingerprint(string $hash): ?PropertyAlert
    {
        return PropertyAlert::query()->where('fingerprint_hash', $hash)->first();
    }
}
