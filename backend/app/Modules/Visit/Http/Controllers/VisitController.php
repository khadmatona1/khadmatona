<?php

namespace App\Modules\Visit\Http\Controllers;

use App\Core\Notification\Notifications\VisitAssigned;
use App\Core\Support\Http\ApiResponse;
use App\Models\User;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Visit\Application\Jobs\SendVisitConfirmationJob;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\Visit\Domain\Enums\VisitReportOutcome;
use App\Modules\Visit\Domain\Enums\VisitStatus;
use App\Modules\Visit\Domain\Models\Visit;
use App\Modules\Visit\Http\Filters\VisitFilter;
use App\Modules\Visit\Http\Requests\AssignVisitRequest;
use App\Modules\Visit\Http\Requests\ReportVisitRequest;
use App\Modules\Visit\Http\Requests\RescheduleVisitRequest;
use App\Modules\Visit\Http\Resources\AdminVisitResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;

/**
 * Authenticated calendar/list + management actions. Simple CRUD-adjacent
 * logic only, no Service layer beyond what's already in
 * Application/VisitConfirmationSender (PROJECT_RULES.md §6).
 */
class VisitController
{
    public function __construct(
        private readonly VisitRepositoryInterface $visits,
        private readonly LeadRepositoryInterface $leads,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    public function index(Request $request, VisitFilter $filter): JsonResponse
    {
        $visits = $filter->apply()->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            AdminVisitResource::collection($visits)->resolve(),
            ['pagination' => [
                'current_page' => $visits->currentPage(),
                'last_page' => $visits->lastPage(),
                'per_page' => $visits->perPage(),
                'total' => $visits->total(),
            ]]
        );
    }

    public function show(Visit $visit): JsonResponse
    {
        Gate::authorize('view', $visit);

        return ApiResponse::success(new AdminVisitResource($this->withDisplay($visit)));
    }

    /**
     * Admin-only, gated purely by route `role:Admin` middleware - no Policy
     * method needed, same precedent as LeadController::destroy(). Never
     * touches the underlying Lead's own frozen `commercial_id`.
     */
    public function assign(AssignVisitRequest $request, Visit $visit): JsonResponse
    {
        $previousCommercialId = $visit->commercial_id;
        $newCommercialId = $request->validated('commercial_id');

        $visit = $this->visits->update($visit, ['commercial_id' => $newCommercialId]);

        // Only notify when this reassignment actually hands the visit to
        // someone new - never on a no-op resubmit of the same commercial,
        // and never when clearing the assignment.
        if ($newCommercialId !== null && $newCommercialId !== $previousCommercialId) {
            $property = $this->properties->find($visit->property_id);
            $lead = $this->leads->find($visit->lead_id);
            $recipient = User::whereKey($newCommercialId)->where('is_active', true)->get();

            Notification::send($recipient, new VisitAssigned($visit, $lead?->name, $property?->title));
        }

        return ApiResponse::success(new AdminVisitResource($this->withDisplay($visit)));
    }

    public function reschedule(RescheduleVisitRequest $request, Visit $visit): JsonResponse
    {
        Gate::authorize('manage', $visit);

        $newScheduledAt = $request->validated('scheduled_at');
        $changed = ! $visit->scheduled_at->equalTo($newScheduledAt);

        $visit = $this->visits->update($visit, [
            'scheduled_at' => $newScheduledAt,
            // Reset so a failed re-send never leaves a stale, misleading
            // confirmation timestamp on the new time.
            'whatsapp_confirmed_at' => $changed ? null : $visit->whatsapp_confirmed_at,
        ]);

        // Only re-fire on an actual time change - never on a no-op
        // resubmit of the same value (mirrors PropertyController's
        // $wasApproved no-op-save guard for PropertyApproved).
        if ($changed) {
            SendVisitConfirmationJob::dispatch($visit->id);
        }

        return ApiResponse::success(new AdminVisitResource($this->withDisplay($visit)));
    }

    public function report(ReportVisitRequest $request, Visit $visit): JsonResponse
    {
        Gate::authorize('manage', $visit);

        $data = $request->validated();
        $status = $data['outcome'] === VisitReportOutcome::NoShow->value ? VisitStatus::NoShow : VisitStatus::Completed;

        $visit = $this->visits->update($visit, [
            'report' => $data['report'] ?? null,
            'report_outcome' => $data['outcome'],
            'status' => $status,
            'completed_at' => now(),
        ]);

        return ApiResponse::success(new AdminVisitResource($this->withDisplay($visit)));
    }

    public function cancel(Visit $visit): JsonResponse
    {
        Gate::authorize('manage', $visit);

        $visit = $this->visits->update($visit, ['status' => VisitStatus::Cancelled]);

        return ApiResponse::success(new AdminVisitResource($this->withDisplay($visit)));
    }

    /**
     * Attaches the same denormalized display fields VisitFilter's raw
     * joins provide on list/index, for the single-resource mutate/show
     * responses below - via the repository interfaces, never a
     * cross-module Eloquent relation (PROJECT_RULES.md §3).
     */
    private function withDisplay(Visit $visit): Visit
    {
        $property = $this->properties->find($visit->property_id);
        $lead = $this->leads->find($visit->lead_id);

        $visit->setAttribute('property_title', $property?->title);
        $visit->setAttribute('lead_name', $lead?->name);
        $visit->setAttribute('lead_email', $lead?->email);
        $visit->setAttribute('lead_phone', $lead?->phone);

        return $visit->load('commercial');
    }
}
