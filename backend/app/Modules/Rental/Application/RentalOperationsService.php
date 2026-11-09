<?php

namespace App\Modules\Rental\Application;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Rental\Application\Concerns\ResolvesPropertyTitles;
use App\Modules\Rental\Domain\Contracts\CleaningRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ExpenseRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\MaintenanceRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Enums\CleaningStatus;
use App\Modules\Rental\Domain\Enums\MaintenanceStatus;
use App\Modules\Rental\Domain\Models\Cleaning;
use App\Modules\Rental\Domain\Models\Expense;
use App\Modules\Rental\Domain\Models\MaintenanceRequest;
use App\Modules\Rental\Domain\Models\ManagedProperty;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Everything around a stay: putting a property under management, cleaning,
 * maintenance and other expenses. Each record carries the catalog
 * property_id of its managed property (denormalized here, never trusted
 * from input), and status changes stamp their own dates.
 */
class RentalOperationsService
{
    use ResolvesPropertyTitles;

    public function __construct(
        private readonly ManagedPropertyRepositoryInterface $managedProperties,
        private readonly CleaningRepositoryInterface $cleanings,
        private readonly MaintenanceRepositoryInterface $maintenance,
        private readonly ExpenseRepositoryInterface $expenses,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    // --- Managed properties ------------------------------------------------

    /**
     * Puts a catalog property under management, or brings back a previously
     * removed management contract with the new terms.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function enroll(array $attributes): ManagedProperty
    {
        $existing = $this->managedProperties->findByPropertyIdWithTrashed((int) $attributes['property_id']);

        if ($existing && ! $existing->trashed()) {
            throw ValidationException::withMessages(['property_id' => 'This property is already under rental management.']);
        }

        if ($existing) {
            $this->managedProperties->restore($existing);
            /** @var ManagedProperty $managed */
            $managed = $this->managedProperties->update($existing, $attributes);
        } else {
            /** @var ManagedProperty $managed */
            $managed = $this->managedProperties->create($attributes);
        }

        return $this->withDisplay($managed);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateManaged(ManagedProperty $managed, array $attributes): ManagedProperty
    {
        return DB::transaction(function () use ($managed, $attributes) {
            $managed = $this->managedProperties->lock($managed->id);
            if ($managed->approval_status !== 'approved') {
                $attributes['is_active'] = false;
            }

            return $this->withDisplay($this->managedProperties->update($managed, $attributes));
        });
    }

    public function reviewManagement(ManagedProperty $managed, bool $approve): ManagedProperty
    {
        return DB::transaction(function () use ($managed, $approve) {
            $managed = $this->managedProperties->lock($managed->id);
            if ($managed->approval_status !== 'pending') {
                throw ValidationException::withMessages(['approval_status' => 'Only pending requests can be reviewed.']);
            }

            return $this->withDisplay($this->managedProperties->update($managed, [
                'approval_status' => $approve ? 'approved' : 'rejected', 'is_active' => $approve,
            ]));
        });
    }

    /** Ends management. History (stays, costs) is kept for statements. */
    public function removeManaged(ManagedProperty $managed): void
    {
        $this->managedProperties->delete($managed);
    }

    // --- Cleaning, maintenance, expenses -----------------------------------

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createCleaning(array $attributes): Cleaning
    {
        /** @var Cleaning $cleaning */
        $cleaning = $this->cleanings->create([
            ...$this->forManagedProperty($attributes),
            'status' => CleaningStatus::Pending,
        ]);

        return $this->withDisplay($cleaning);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateCleaning(Cleaning $cleaning, array $attributes): Cleaning
    {
        if (isset($attributes['status'])) {
            $done = $attributes['status'] === CleaningStatus::Done->value;
            $attributes['completed_at'] = $done ? ($cleaning->completed_at ?? Carbon::now()) : null;
        }

        return $this->withDisplay($this->cleanings->update($cleaning, $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createMaintenance(array $attributes): MaintenanceRequest
    {
        /** @var MaintenanceRequest $request */
        $request = $this->maintenance->create([
            ...$this->forManagedProperty($attributes),
            'status' => MaintenanceStatus::Open,
            'reported_on' => $attributes['reported_on'] ?? Carbon::now((string) config('app.business_timezone'))->toDateString(),
        ]);

        return $this->withDisplay($request);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateMaintenance(MaintenanceRequest $request, array $attributes): MaintenanceRequest
    {
        if (isset($attributes['status'])) {
            $resolved = $attributes['status'] === MaintenanceStatus::Resolved->value;
            $attributes['resolved_at'] = $resolved ? ($request->resolved_at ?? Carbon::now()) : null;
        }

        return $this->withDisplay($this->maintenance->update($request, $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createExpense(array $attributes): Expense
    {
        /** @var Expense $expense */
        $expense = $this->expenses->create($this->forManagedProperty($attributes));

        return $this->withDisplay($expense);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateExpense(Expense $expense, array $attributes): Expense
    {
        return $this->withDisplay($this->expenses->update($expense, $attributes));
    }

    public function deleteCleaning(Cleaning $cleaning): void
    {
        $this->cleanings->delete($cleaning);
    }

    public function deleteMaintenance(MaintenanceRequest $request): void
    {
        $this->maintenance->delete($request);
    }

    public function deleteExpense(Expense $expense): void
    {
        $this->expenses->delete($expense);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function forManagedProperty(array $attributes): array
    {
        /** @var ManagedProperty|null $managed */
        $managed = $this->managedProperties->find($attributes['rental_property_id']);
        if (! $managed || $managed->approval_status !== 'approved') {
            throw ValidationException::withMessages(['rental_property_id' => 'This property is not under rental management.']);
        }

        return [...$attributes, 'property_id' => $managed->property_id];
    }
}
