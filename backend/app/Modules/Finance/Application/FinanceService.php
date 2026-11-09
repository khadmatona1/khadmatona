<?php

namespace App\Modules\Finance\Application;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Models\User;
use App\Modules\Finance\Domain\Contracts\FinanceRepository;
use App\Modules\Finance\Domain\Models\FinancialEntry;
use Carbon\CarbonImmutable;

class FinanceService
{
    public function __construct(private readonly FinanceRepository $entries, private readonly PropertyDirectory $properties) {}

    private function emptyTotals(): array
    {
        return array_fill_keys(['revenue', 'commissions', 'expenses', 'receipts', 'disbursements', 'margin', 'cash_balance', 'unpaid', 'fee_count'], 0);
    }

    public function report(array $filters): array
    {
        $totals = $this->emptyTotals();
        $commercials = $properties = $trend = [];
        for ($month = CarbonImmutable::parse($filters['from'])->startOfMonth(); $month->toDateString() <= $filters['to']; $month = $month->addMonth()) {
            $trend[$month->format('Y-m')] = ['month' => $month->format('Y-m'), ...$this->emptyTotals()];
        }

        foreach ($this->entries->reportEntries($filters) as $entry) {
            $commercialId = $entry->commercial_id ?? 0;
            $propertyId = $entry->property_id ?? 0;
            $commercials[$commercialId] ??= ['id' => $entry->commercial_id, ...$this->emptyTotals()];
            $properties[$propertyId] ??= ['id' => $entry->property_id, ...$this->emptyTotals()];
            $date = $entry->occurred_on->toDateString();
            $paid = $entry->paid_on?->toDateString();
            $events = [];
            if ($date >= $filters['from'] && $date <= $filters['to']) {
                $metric = ['fee' => 'revenue', 'commission' => 'commissions', 'expense' => 'expenses'][$entry->kind];
                $events[] = [$date, $metric, $entry->amount_cents];
                if ($entry->kind === 'fee') {
                    $events[] = [$date, 'fee_count', 1];
                    if ($paid === null || $paid > $filters['to']) {
                        $events[] = [$date, 'unpaid', $entry->amount_cents];
                    }
                }
            }
            if ($paid !== null && $paid >= $filters['from'] && $paid <= $filters['to']) {
                $events[] = [$paid, $entry->kind === 'fee' ? 'receipts' : 'disbursements', $entry->amount_cents];
            }
            foreach ($events as [$eventDate, $metric, $amount]) {
                $totals[$metric] += $amount;
                $commercials[$commercialId][$metric] += $amount;
                $properties[$propertyId][$metric] += $amount;
                $trend[substr($eventDate, 0, 7)][$metric] += $amount;
            }
        }
        $titles = $this->properties->titles(array_keys($properties));
        $names = User::whereIn('id', array_keys($commercials))->pluck('name', 'id')->all();
        foreach ($commercials as $id => &$row) {
            $row['name'] = $names[$id] ?? null;
        }
        unset($row);
        foreach ($properties as $id => &$row) {
            $row['name'] = $titles[$id] ?? null;
        }
        unset($row);
        $sort = function (array $rows) use ($filters): array {
            $metric = ($filters['kind'] ?? null) === 'commission' ? 'commissions' : 'revenue';
            usort($rows, fn ($a, $b) => $b[$metric] <=> $a[$metric] ?: ($a['id'] ?? 0) <=> ($b['id'] ?? 0));

            return array_map($this->withBalances(...), $rows);
        };
        $page = $this->entries->paginate($filters);
        $entryTitles = $this->properties->titles($page->getCollection()->pluck('property_id')->filter()->all());
        $entryNames = User::whereIn('id', $page->getCollection()->pluck('commercial_id')->filter())->pluck('name', 'id')->all();

        return [
            'from' => $filters['from'], 'to' => $filters['to'], 'currency' => 'MAD',
            'totals' => $this->withBalances($totals),
            'commercials' => $sort(array_values($commercials)),
            'properties' => $sort(array_values($properties)),
            'trend' => array_map($this->withBalances(...), array_values($trend)),
            'entries' => $page->getCollection()->map(fn ($entry) => [
                ...$this->serialize($entry), 'property_title' => $entryTitles[$entry->property_id] ?? null, 'commercial_name' => $entryNames[$entry->commercial_id] ?? null,
            ])->all(),
            'pagination' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ];
    }

    private function withBalances(array $row): array
    {
        $row['margin'] = $row['revenue'] - $row['commissions'] - $row['expenses'];
        $row['cash_balance'] = $row['receipts'] - $row['disbursements'];

        return $row;
    }

    public function save(array $data, int $actor, ?FinancialEntry $entry = null): FinancialEntry
    {
        [$whole, $fraction] = array_pad(explode('.', (string) $data['amount']), 2, '');
        $data['amount_cents'] = (int) $whole * 100 + (int) str_pad($fraction, 2, '0');
        unset($data['amount']);
        if ($entry === null) {
            $data['created_by'] = $actor;
        }

        return $this->entries->save($data, $entry);
    }

    public function serialize(FinancialEntry $entry): array
    {
        return [
            'id' => $entry->id, 'kind' => $entry->kind, 'label' => $entry->label,
            'amount_cents' => $entry->amount_cents, 'occurred_on' => $entry->occurred_on->toDateString(),
            'paid_on' => $entry->paid_on?->toDateString(), 'commercial_id' => $entry->commercial_id,
            'property_id' => $entry->property_id, 'notes' => $entry->notes,
        ];
    }
}
