<?php

namespace App\Modules\Lead\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\Lead\Domain\Models\Lead;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;

class LeadFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        $query = Lead::query();

        // Every route this filter serves sits behind auth:sanctum +
        // role:Admin|Commercial|SeniorCommercial, so $user is always one of
        // those roles in practice - the final branch is defense-in-depth
        // only, in case this filter is ever reused somewhere less
        // restricted.
        $user = $this->request->user();

        if ($user?->hasRole('Admin')) {
            return $query;
        }

        if ($user?->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            return $query->where('commercial_id', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            'type',
            'status',
            'commercial_id',
            'property_id',
            'contact_id',
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where(function ($query) use ($value) {
                    $query->where('name', 'like', "%{$value}%")
                        ->orWhere('email', 'like', "%{$value}%");
                });
            }),
            // "Reçu le" date range, inclusive, as Morocco calendar days
            // (filter[created_from]=2026-09-01&filter[created_to]=2026-09-24).
            // Days follow config('app.business_timezone'), the same Morocco
            // time the team reads everywhere else, not the UTC storage day.
            AllowedFilter::callback('created_from', function ($query, $value) {
                $query->where('created_at', '>=', $this->localDay($value, 'created_from')->startOfDay()->utc());
            }),
            AllowedFilter::callback('created_to', function ($query, $value) {
                $query->where('created_at', '<=', $this->localDay($value, 'created_to')->endOfDay()->utc());
            }),
        ];
    }

    private function localDay(mixed $value, string $filter): CarbonImmutable
    {
        $value = is_string($value) ? $value : '';
        $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1
            ? CarbonImmutable::createFromFormat('!Y-m-d', $value, (string) config('app.business_timezone'))
            : false;

        // createFromFormat() silently rolls "2026-02-31" over to March -
        // the round-trip check rejects that instead of filtering on a
        // different day than the one asked for.
        if ($date === false || $date->format('Y-m-d') !== $value) {
            throw ValidationException::withMessages([
                "filter.{$filter}" => 'The date must be a valid date in the YYYY-MM-DD format.',
            ]);
        }

        return $date;
    }

    /**
     * @return array<int, string>
     */
    protected function allowedSorts(): array
    {
        return ['created_at'];
    }
}
