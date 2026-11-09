<?php

namespace App\Modules\Rental\Http\Filters;

use App\Modules\Rental\Domain\Models\Expense;
use Spatie\QueryBuilder\AllowedFilter;

class ExpenseFilter extends RentalFilter
{
    protected function model(): string
    {
        return Expense::class;
    }

    protected function table(): string
    {
        return 'rental_expenses';
    }

    protected function allowedFilters(): array
    {
        return [
            ...$this->commonFilters(),
            ...$this->dateRangeFilters('incurred_on'),
            AllowedFilter::exact('category', 'rental_expenses.category'),
            AllowedFilter::exact('charged_to', 'rental_expenses.charged_to'),
        ];
    }

    protected function allowedSorts(): array
    {
        return [$this->sort('incurred_on'), $this->sort('amount'), $this->sort('created_at')];
    }
}
