<?php

namespace App\Modules\CommercialLead\Application\Actions;

use App\Modules\CommercialLead\Domain\Contracts\CommercialLeadRepositoryInterface;
use Illuminate\Support\Facades\DB;

class ImportCommercialLeadsAction
{
    public function __construct(private readonly CommercialLeadRepositoryInterface $leads) {}

    public function execute(array $rows): int
    {
        return DB::transaction(function () use ($rows) {
            foreach ($rows as $row) {
                $this->leads->create($row);
            }

            return count($rows);
        });
    }
}
