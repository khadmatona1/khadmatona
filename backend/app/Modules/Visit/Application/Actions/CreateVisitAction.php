<?php

namespace App\Modules\Visit\Application\Actions;

use App\Core\Notification\Notifications\VisitAssigned;
use App\Models\User;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\Visit\Domain\Enums\VisitStatus;
use App\Modules\Visit\Domain\Events\VisitBooked;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Booking a visit creates BOTH a Lead (type=visit_request - so the existing
 * "Demandes de visite" admin inbox stays the single source of truth for the
 * inquiry, exactly like every other visit_request today) and the Visit
 * itself (the operational scheduling/assignment/report record), in one
 * transaction. Depends on Lead's and Property's repository *interfaces*
 * (Domain contracts), never their Eloquent models directly - the sanctioned
 * cross-module mechanism StoreLeadController already uses for
 * PropertyRepositoryInterface (PROJECT_RULES.md §3).
 */
class CreateVisitAction
{
    public function __construct(
        private readonly LeadRepositoryInterface $leads,
        private readonly PropertyRepositoryInterface $properties,
        private readonly VisitRepositoryInterface $visits,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     */
    public function execute(array $validated): Visit
    {
        $property = null;
        $lead = null;

        $visit = DB::transaction(function () use ($validated, &$property, &$lead) {
            $property = $this->properties->find($validated['property_id']);
            $commercialId = $property?->commercial_id;

            $lead = $this->leads->create([
                'type' => 'visit_request',
                'status' => 'new',
                'name' => $validated['name'],
                'email' => $validated['email'] ?? '',
                'phone' => $validated['phone'],
                'message' => $validated['message'] ?? null,
                'property_id' => $validated['property_id'],
                'commercial_id' => $commercialId,
            ]);

            /** @var Visit $visit */
            $visit = $this->visits->create([
                'lead_id' => $lead->id,
                'property_id' => $validated['property_id'],
                'commercial_id' => $commercialId,
                'scheduled_at' => $validated['scheduled_at'],
                'status' => VisitStatus::Scheduled,
            ]);

            return $visit;
        });

        // Dispatched after the transaction commits, not from inside it -
        // this codebase's queue connections all have after_commit=false
        // (config/queue.php), so there's no automatic commit-deferral to
        // lean on; the safe point is once DB::transaction() has returned.
        VisitBooked::dispatch($visit->id);
        $this->notifyCommercial($visit, $lead?->name, $property?->title, $visit->commercial_id);

        return $visit;
    }

    /**
     * Whoever the visit is (auto-)assigned to at booking time needs to know
     * - or, when the property has no owner, every Admin (same fallback
     * DueCallbackNotifier uses for ownerless leads).
     */
    private function notifyCommercial(Visit $visit, ?string $leadName, ?string $propertyTitle, ?int $commercialId): void
    {
        $recipients = $commercialId
            ? User::whereKey($commercialId)->where('is_active', true)->get()
            : collect();

        if ($recipients->isEmpty()) {
            $recipients = User::role('Admin')->get();
        }

        Notification::send($recipients, new VisitAssigned($visit, $leadName, $propertyTitle));
    }
}
