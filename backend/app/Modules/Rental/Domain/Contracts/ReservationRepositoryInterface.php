<?php

namespace App\Modules\Rental\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\Rental\Domain\Models\Reservation;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

interface ReservationRepositoryInterface extends RepositoryInterface
{
    /**
     * Whether a non-cancelled reservation of the same managed property
     * overlaps [checkIn, checkOut). Back-to-back stays (one checks out the
     * day the next checks in) do not overlap.
     */
    public function hasOverlap(int $rentalPropertyId, CarbonInterface $checkIn, CarbonInterface $checkOut, ?int $ignoreId = null): bool;

    /**
     * Non-cancelled stays whose check-in falls in [from, to], per property.
     *
     * @param  array<int, int>|null  $propertyIds
     * @return array<int, array{reservations: int, nights: int, gross: int, platform_fees: int, net: int, commission: int}> Keyed by catalog property_id, amounts in cents.
     */
    public function revenueByProperty(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds = null): array;

    /**
     * Non-cancelled reservations overlapping [from, to) (occupancy).
     *
     * @return Collection<int, Reservation>
     */
    public function overlapping(CarbonInterface $from, CarbonInterface $to): Collection;

    /**
     * @param  array<int, string>  $statuses
     * @return Collection<int, Reservation>
     */
    public function withDateBetween(string $column, CarbonInterface $from, CarbonInterface $to, array $statuses, int $limit = 20): Collection;

    public function countByStatus(string $status): int;

    /**
     * Non-cancelled reservations of the given catalog properties with a
     * check-in in [from, to], newest first (Owner Portal).
     *
     * @param  array<int, int>  $propertyIds
     * @return Collection<int, Reservation>
     */
    public function forPropertiesBetween(array $propertyIds, CarbonInterface $from, CarbonInterface $to): Collection;
}
