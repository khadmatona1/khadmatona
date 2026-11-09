<?php

namespace App\Core\Support\QueryFilters;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Every module declares its own allow-listed filters/sorts/includes by
 * extending this instead of parsing query-string filtering, sorting,
 * and searching by hand in each controller.
 */
abstract class BaseQueryFilter
{
    public function __construct(protected Request $request) {}

    /**
     * A plain class-string is enough for a module with no required eager
     * loads (e.g. LeadFilter). A module whose Resource always needs
     * relations (e.g. PropertyResource needing city/district/media) should
     * return a pre-built Builder with ->with(...) already applied instead,
     * so the list endpoint never N+1s.
     *
     * @return class-string|Builder
     */
    abstract protected function subject(): string|Builder;

    /**
     * @return array<int, string|AllowedFilter>
     */
    abstract protected function allowedFilters(): array;

    /**
     * @return array<int, string>
     */
    protected function allowedSorts(): array
    {
        return [];
    }

    /**
     * @return array<int, string>
     */
    protected function allowedIncludes(): array
    {
        return [];
    }

    public function apply(): QueryBuilder
    {
        // allowedFilters()/allowedSorts()/allowedIncludes() are variadic
        // (AllowedFilter|string ...$filters) - spread each module's array,
        // don't pass it as a single positional argument.
        return QueryBuilder::for($this->subject(), $this->request)
            ->allowedFilters(...$this->allowedFilters())
            ->allowedSorts(...$this->allowedSorts())
            ->allowedIncludes(...$this->allowedIncludes());
    }
}
