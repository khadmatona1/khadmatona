<?php

namespace App\Modules\CommercialLead\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\CommercialLead\Domain\Contracts\CommercialLeadRepositoryInterface;
use App\Modules\CommercialLead\Domain\Models\CommercialLead;

class EloquentCommercialLeadRepository extends BaseRepository implements CommercialLeadRepositoryInterface
{
    protected function model(): string
    {
        return CommercialLead::class;
    }
}
