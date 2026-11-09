<?php

namespace App\Modules\Lead\Http\Resources;

use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin/Commercial dashboard view of a lead - unlike LeadResource (the
 * public echo-back used by the unauthenticated capture endpoint), this
 * exposes every column. Only ever returned from routes behind
 * auth:sanctum + role:Admin|Commercial, and (per-instance) LeadPolicy - a
 * Commercial only ever reaches their own leads, so `commercial_id` here is
 * never someone else's information.
 *
 * @mixin Lead
 */
class AdminLeadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'callback_at' => $this->callback_at,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'message' => $this->message,
            'property_id' => $this->property_id,
            'property_type' => $this->property_type?->value,
            'city' => $this->city,
            'district' => $this->district,
            'address' => $this->address,
            'property_details' => $this->property_details,
            'photos' => $this->whenLoaded('media', fn () => $this->getMedia('photos')->map(fn ($media) => [
                'id' => $media->id,
                'url' => $media->getUrl(),
            ])),
            'commercial_id' => $this->commercial_id,
            'contact_id' => $this->contact_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
