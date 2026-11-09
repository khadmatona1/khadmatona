<?php

namespace App\Modules\Rental\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Rental\Domain\Contracts\ExpenseRepositoryInterface;
use App\Modules\Rental\Domain\Models\Expense;
use App\Modules\Rental\Infrastructure\Repositories\Concerns\SumsCostsByProperty;
use Illuminate\Database\Eloquent\Builder;

class EloquentExpenseRepository extends BaseRepository implements ExpenseRepositoryInterface
{
    use SumsCostsByProperty;

    protected function model(): string
    {
        return Expense::class;
    }

    protected function costQuery(): Builder
    {
        return Expense::query();
    }

    protected function costDateColumn(): string
    {
        return 'incurred_on';
    }

    protected function costDateIsTimestamp(): bool
    {
        return false;
    }

    protected function costAmountColumn(): string
    {
        return 'amount';
    }

    protected function describeCost(object $row): array
    {
        return ['source' => 'expense', 'category' => $row->category->value, 'label' => (string) $row->label];
    }
}
