<?php

namespace App\Modules\Rental\Application;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Domain\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Espace Propriétaire, read-only: the rental statement and stays of the
 * properties this owner's Contact owns (Property.owner_contact_id, resolved
 * through PropertyRepositoryInterface - same scope the rest of the Owner
 * Portal uses). Never another owner's data, never guest identities.
 */
class OwnerRentalService
{
    public function __construct(
        private readonly PropertyRepositoryInterface $properties,
        private readonly ReservationRepositoryInterface $reservations,
        private readonly RentalStatementService $statements,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function statement(?int $ownerContactId, string $month): array
    {
        return $this->statements->forMonth($month, $this->ownedPropertyIds($ownerContactId), withLines: true);
    }

    /**
     * @return Collection<int, Reservation>
     */
    public function reservations(?int $ownerContactId, string $month): Collection
    {
        $ids = $this->ownedPropertyIds($ownerContactId);
        $from = CarbonImmutable::createFromFormat('!Y-m', $month, (string) config('app.business_timezone'))->startOfMonth();

        $stays = $this->reservations->forPropertiesBetween($ids, $from, $from->endOfMonth());
        $titles = $this->properties->titlesByIds($ids);

        return $stays->each(fn (Reservation $stay) => $stay->setAttribute('property_title', $titles[$stay->property_id] ?? null));
    }

    /**
     * @return array<int, int>
     */
    private function ownedPropertyIds(?int $ownerContactId): array
    {
        if ($ownerContactId === null) {
            return [];
        }

        // Owners realistically hold a handful of properties - one generous
        // page is "all of them", same as OwnerReportController.
        return $this->properties->paginateForOwner($ownerContactId, 1000)->pluck('id')->map(fn ($id) => (int) $id)->all();
    }
}
