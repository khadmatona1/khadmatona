<?php

namespace App\Core\Auth\Infrastructure\Repositories;

use App\Core\Auth\Domain\Contracts\UserRepositoryInterface;
use App\Core\Support\Repositories\BaseRepository;
use App\Models\User;

class EloquentUserRepository extends BaseRepository implements UserRepositoryInterface
{
    protected function model(): string
    {
        return User::class;
    }
}
