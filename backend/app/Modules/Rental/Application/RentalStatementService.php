<?php

namespace App\Modules\Rental\Application;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\CleaningRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ExpenseRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\MaintenanceRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Domain\Support\Money;
use Carbon\CarbonImmutable;

/**
 * Monthly statement: revenue, costs, and the owner / KHADMATONA split.
 *
 * Per property, for one calendar month (business timezone):
 *   net revenue       = guest payments - platform fees   (stays by check-in date)
 *   commission        = net revenue x rate frozen on each reservation
 *   owner share       = net revenue - commission - costs charged to the owner
 *   KHADMATONA share  = commission - costs charged to KHADMATONA
 * Costs: done cleanings (scheduled day), resolved maintenance (resolution
 * day), other expenses (day incurred).
 *
 * Amounts are returned in MAD (the API's unit), computed in cents.
 */
class RentalStatementService
{
    public function __construct(
        private readonly ManagedPropertyRepositoryInterface $managedProperties,
        private readonly ReservationRepositoryInterface $reservations,
        private readonly CleaningRepositoryInterface $cleanings,
        private readonly MaintenanceRepositoryInterface $maintenance,
        private readonly ExpenseRepositoryInterface $expenses,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    /**
     * @param  string  $month  "YYYY-MM"
     * @param  array<int, int>|null  $propertyIds  Limit to these catalog properties (Owner Portal).
     * @return array<string, mixed>
     */
    public function forMonth(string $month, ?array $propertyIds = null, bool $withLines = false): array
    {
        $from = CarbonImmutable::createFromFormat('!Y-m', $month, (string) config('app.business_timezone'))->startOfMonth();
        $to = $from->endOfMonth();

        $managed = $this->managedProperties->forStatements($propertyIds);
        $scope = $propertyIds ?? array_column($managed, 'property_id');

        $revenue = $this->reservations->revenueByProperty($from, $to, $scope);
        $costSources = [$this->cleanings, $this->maintenance, $this->expenses];
        $costs = array_map(fn ($source) => $source->costsByProperty($from, $to, $scope), $costSources);

        $lines = [];
        if ($withLines) {
            foreach ($costSources as $source) {
                foreach ($source->costLines($from, $to, $scope) as $line) {
                    $lines[$line['property_id']][] = [...$line, 'amount' => Money::toMad($line['amount'])];
                }
            }
        }

        $titles = $this->properties->titlesByIds(array_column($managed, 'property_id'));
        $totals = array_fill_keys(['reservations', 'nights', 'gross', 'platform_fees', 'net_revenue', 'commission', 'expenses_owner', 'expenses_khadmatona', 'owner_share', 'khadmatona_share'], 0);
        $rows = [];

        foreach ($managed as $property) {
            $id = $property['property_id'];
            $stay = $revenue[$id] ?? ['reservations' => 0, 'nights' => 0, 'gross' => 0, 'platform_fees' => 0, 'net' => 0, 'commission' => 0];
            $ownerCosts = array_sum(array_map(fn ($c) => $c[$id]['owner'] ?? 0, $costs));
            $khadmatonaCosts = array_sum(array_map(fn ($c) => $c[$id]['khadmatona'] ?? 0, $costs));

            // Inactive properties only appear when the month has activity.
            if (! $property['is_active'] && $stay['reservations'] === 0 && $ownerCosts === 0 && $khadmatonaCosts === 0) {
                continue;
            }

            $row = [
                'reservations' => $stay['reservations'],
                'nights' => $stay['nights'],
                'gross' => $stay['gross'],
                'platform_fees' => $stay['platform_fees'],
                'net_revenue' => $stay['net'],
                'commission' => $stay['commission'],
                'expenses_owner' => $ownerCosts,
                'expenses_khadmatona' => $khadmatonaCosts,
                'owner_share' => $stay['net'] - $stay['commission'] - $ownerCosts,
                'khadmatona_share' => $stay['commission'] - $khadmatonaCosts,
            ];

            foreach ($row as $key => $value) {
                $totals[$key] += $value;
            }

            $rows[] = [
                'rental_property_id' => $property['rental_property_id'],
                'property_id' => $id,
                'property_title' => $titles[$id] ?? null,
                'commission_rate' => Money::basisPointsToPercent($property['commission_rate_bp']),
                'is_active' => $property['is_active'],
                ...$this->reservationCounts($row),
                ...$this->toMad($row),
                ...($withLines ? ['lines' => $lines[$id] ?? []] : []),
            ];
        }

        return [
            'month' => $from->format('Y-m'),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'properties' => $rows,
            'totals' => [...$this->reservationCounts($totals), ...$this->toMad($totals)],
        ];
    }

    /**
     * @param  array<string, int>  $row
     * @return array{reservations: int, nights: int}
     */
    private function reservationCounts(array $row): array
    {
        return ['reservations' => $row['reservations'], 'nights' => $row['nights']];
    }

    /**
     * @param  array<string, int>  $row
     * @return array<string, float>
     */
    private function toMad(array $row): array
    {
        $money = array_diff_key($row, array_flip(['reservations', 'nights']));

        return array_map(fn (int $cents) => Money::toMad($cents), $money);
    }
}
