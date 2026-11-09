<?php

namespace App\Modules\Property\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PropertyRepositoryInterface extends RepositoryInterface
{
    /**
     * Every property owned by the given Contact (Owner Portal - "Espace
     * Propriétaire"), every status/approval_status included since there's
     * nothing to hide from a property's own owner.
     */
    public function paginateForOwner(int $ownerContactId, int $perPage = 15): LengthAwarePaginator;

    /**
     * Aggregate figures for the dashboard overview - computed straight from
     * the properties table, not illustrative/hardcoded data.
     *
     * @return array{
     *     status_counts: array<string, int>,
     *     new_this_month: int,
     *     revenue_this_month: int,
     *     monthly_trend: array<int, array{month: string, count: int}>,
     * }
     */
    public function dashboardStats(): array;

    /**
     * Titles for the given ids, soft-deleted properties included, so
     * historical reports (visitor analytics) can still name a listing
     * that has since been removed.
     *
     * @param  array<int, int>  $ids
     * @return array<int, string> Keyed by property id.
     */
    public function titlesByIds(array $ids): array;
}
