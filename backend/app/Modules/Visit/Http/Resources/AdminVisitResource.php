<?php

namespace App\Modules\Visit\Http\Resources;

use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin/Commercial dashboard view - only ever returned from routes behind
 * auth:sanctum + role:Admin|Commercial|SeniorCommercial, and (per-instance)
 * VisitPolicy for the mutate actions.
 *
 * `property_title`/`lead_name`/`lead_email`/`lead_phone` are denormalized
 * display fields, populated either by VisitFilter's raw joins (list/index)
 * or VisitController::withDisplay() (single-resource mutate responses) -
 * never a cross-module Eloquent relation (PROJECT_RULES.md §3). They come
 * back null only if a Visit is resolved through neither path.
 *
 * @mixin Visit
 */
class AdminVisitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_id' => $this->lead_id,
            'property_id' => $this->property_id,
            'property_title' => $this->property_title ?? null,
            'lead_name' => $this->lead_name ?? null,
            'lead_email' => $this->lead_email ?? null,
            'lead_phone' => $this->lead_phone ?? null,
            'commercial_id' => $this->commercial_id,
            'commercial_name' => $this->whenLoaded('commercial', fn () => $this->commercial?->name),
            'scheduled_at' => $this->scheduled_at,
            'status' => $this->status->value,
            'report' => $this->report,
            'report_outcome' => $this->report_outcome?->value,
            'completed_at' => $this->completed_at,
            'whatsapp_confirmed_at' => $this->whatsapp_confirmed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
