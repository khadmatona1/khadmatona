<?php

namespace App\Modules\OwnerPortal\Http\Resources;

use App\Modules\Property\Domain\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Owner Portal's read-only view of one of their own properties - every
 * row this resource ever wraps has already been scoped to the caller
 * (PropertyRepositoryInterface::paginateForOwner() / an explicit
 * owner_contact_id check in the controller), so there's nothing here an
 * Owner shouldn't see about their own listing.
 *
 * `leads_count`/`completed_visits_count` are attached by the controller as
 * dynamic attributes (not Eloquent relations - Lead/Visit are peer business
 * modules, PROJECT_RULES.md §3) via LeadRepositoryInterface/
 * VisitRepositoryInterface, so they read `null` only if a caller forgets to
 * attach them - never silently wrong.
 *
 * @mixin Property
 */
class OwnerPropertyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'approval_status' => $this->approval_status->value,
            'rejection_reason' => $this->rejection_reason,
            'commercial_name' => $this->commercial?->name,
            'city_name' => $this->city?->translate('name'),
            'district_name' => $this->district?->translate('name'),
            'address' => $this->address,
            'price' => $this->price / 100,
            'surface' => $this->surface,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'cover_image' => $this->getFirstMediaUrl('gallery', 'medium') ?: null,
            'leads_count' => $this->leads_count ?? null,
            'completed_visits_count' => $this->completed_visits_count ?? null,
            'created_at' => $this->created_at,
        ];
    }
}
