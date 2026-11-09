<?php

namespace App\Modules\Rental\Infrastructure\Repositories\Concerns;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * The one implementation of RentalCostRepositoryInterface, shared by the
 * cleaning, maintenance and expense repositories: each only says which rows
 * count (costQuery), on which date column, and how a row reads as a line.
 *
 * `from`/`to` are business-timezone days. DATE columns compare as plain
 * dates; TIMESTAMP columns (stored in UTC) compare against the UTC bounds of
 * those same days.
 */
trait SumsCostsByProperty
{
    /** Rows whose cost counts (e.g. only done cleanings). */
    abstract protected function costQuery(): Builder;

    abstract protected function costDateColumn(): string;

    abstract protected function costDateIsTimestamp(): bool;

    abstract protected function costAmountColumn(): string;

    /**
     * @return array{source: string, category: string, label: string}
     */
    abstract protected function describeCost(object $row): array;

    public function costsByProperty(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds = null): array
    {
        $amount = $this->costAmountColumn();

        $rows = $this->costWindow($from, $to, $propertyIds)
            ->toBase()
            ->selectRaw("property_id, charged_to, sum({$amount}) as total")
            ->groupBy('property_id', 'charged_to')
            ->get();

        $costs = [];
        foreach ($rows as $row) {
            $costs[(int) $row->property_id] ??= ['owner' => 0, 'khadmatona' => 0];
            $costs[(int) $row->property_id][(string) $row->charged_to] += (int) $row->total;
        }

        return $costs;
    }

    public function costLines(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds = null): array
    {
        $date = $this->costDateColumn();

        return $this->costWindow($from, $to, $propertyIds)
            ->orderBy($date)
            ->get()
            ->map(function ($row) use ($date) {
                $value = $row->{$date};

                return [
                    'property_id' => (int) $row->property_id,
                    ...$this->describeCost($row),
                    'date' => $value instanceof CarbonInterface ? $value->toDateString() : (string) $value,
                    'amount' => (int) $row->{$this->costAmountColumn()},
                    'charged_to' => $row->charged_to->value,
                ];
            })
            ->all();
    }

    /**
     * @param  array<int, int>|null  $propertyIds
     */
    private function costWindow(CarbonInterface $from, CarbonInterface $to, ?array $propertyIds): Builder
    {
        $query = $this->costQuery()->where($this->costAmountColumn(), '>', 0);

        if ($this->costDateIsTimestamp()) {
            $query->whereBetween($this->costDateColumn(), [$from->copy()->startOfDay()->utc(), $to->copy()->endOfDay()->utc()]);
        } else {
            $query->whereBetween($this->costDateColumn(), [$from->toDateString(), $to->toDateString()]);
        }

        if ($propertyIds !== null) {
            $query->whereIn('property_id', $propertyIds);
        }

        return $query;
    }
}
