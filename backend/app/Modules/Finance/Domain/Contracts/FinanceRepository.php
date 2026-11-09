<?php

namespace App\Modules\Finance\Domain\Contracts;

use App\Modules\Finance\Domain\Models\FinancialEntry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface FinanceRepository
{
    public function reportEntries(array $filters): Collection;

    public function paginate(array $filters): LengthAwarePaginator;

    public function save(array $data, ?FinancialEntry $entry = null): FinancialEntry;

    public function delete(FinancialEntry $entry): void;
}
