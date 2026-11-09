<?php

namespace App\Modules\Rental\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedSort;

/**
 * Shared base for the rental lists: every list shows the property title,
 * read with a raw join on the properties table (same approach as
 * VisitFilter - no cross-module Eloquent relation, PROJECT_RULES.md §3), and
 * can be narrowed to one catalog property. Column names are table-qualified
 * everywhere because `properties` shares several (status, id, ...).
 */
abstract class RentalFilter extends BaseQueryFilter
{
    /** @return class-string<Model> */
    abstract protected function model(): string;

    abstract protected function table(): string;

    protected function subject(): Builder
    {
        $table = $this->table();

        return $this->model()::query()
            ->select("{$table}.*", 'properties.title as property_title')
            ->leftJoin('properties', 'properties.id', '=', "{$table}.property_id");
    }

    /**
     * @return array<int, AllowedFilter>
     */
    protected function commonFilters(): array
    {
        return [
            AllowedFilter::exact('property_id', "{$this->table()}.property_id"),
            AllowedFilter::exact('rental_property_id', "{$this->table()}.rental_property_id"),
        ];
    }

    /**
     * Inclusive [from, to] range on a DATE column: filter[from]=, filter[to]=.
     *
     * @return array<int, AllowedFilter>
     */
    protected function dateRangeFilters(string $column): array
    {
        $qualified = "{$this->table()}.{$column}";

        return [
            AllowedFilter::callback('from', fn ($query, $value) => $query->where($qualified, '>=', (string) $value)),
            AllowedFilter::callback('to', fn ($query, $value) => $query->where($qualified, '<=', (string) $value)),
        ];
    }

    protected function sort(string $name, ?string $column = null): AllowedSort
    {
        return AllowedSort::field($name, "{$this->table()}.".($column ?? $name));
    }
}
