<?php

namespace App\Modules\Contact\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Contact\Domain\Contracts\ContactRepositoryInterface;
use App\Modules\Contact\Domain\Models\Contact;

class EloquentContactRepository extends BaseRepository implements ContactRepositoryInterface
{
    protected function model(): string
    {
        return Contact::class;
    }
}
