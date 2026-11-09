<?php

namespace App\Modules\Finance\Infrastructure\Repositories;

use App\Modules\Finance\Domain\Contracts\FinanceRepository;
use App\Modules\Finance\Domain\Models\FinancialEntry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class EloquentFinanceRepository implements FinanceRepository
{
    private function scoped(array $filters): Builder
    {
        return FinancialEntry::query()
            ->when($filters['kind'] ?? null, fn ($q, $kind) => $q->where('kind', $kind))
            ->when($filters['property_id'] ?? null, fn ($q, $id) => $q->where('property_id', $id))
            ->when($filters['commercial_id'] ?? null, fn ($q, $id) => $q->where('commercial_id', $id));
    }

    public function reportEntries(array $filters): Collection
    {
        // Include older fees paid in this period, without recognising their revenue twice.
        return $this->scoped($filters)->where(fn ($q) => $q
            ->whereBetween('occurred_on', [$filters['from'], $filters['to']])
            ->orWhereBetween('paid_on', [$filters['from'], $filters['to']]))
            ->get(['id', 'kind', 'amount_cents', 'occurred_on', 'paid_on', 'property_id', 'commercial_id']);
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->scoped($filters)->where(fn ($q) => $q
            ->whereBetween('occurred_on', [$filters['from'], $filters['to']])
            ->orWhereBetween('paid_on', [$filters['from'], $filters['to']]))
            ->orderByDesc('occurred_on')->orderByDesc('id')->paginate(15, ['*'], 'page', $filters['page'] ?? 1);
    }

    public function save(array $data, ?FinancialEntry $entry = null): FinancialEntry
    {
        $entry ??= new FinancialEntry;
        $entry->fill($data)->save();

        return $entry->refresh();
    }

    public function delete(FinancialEntry $entry): void
    {
        $entry->delete();
    }
}
