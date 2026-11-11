<?php

namespace App\Modules\Property\Http\Resources;

use App\Modules\Property\Domain\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Authenticated dashboard view of a property - unlike PropertyResource (the
 * public read used by the unauthenticated storefront), this exposes
 * moderation/ownership fields. Only ever returned from routes behind
 * auth:sanctum + role:Admin|Commercial, and only for rows PropertyFilter/
 * PropertyPolicy already scoped to the caller (Admin: any row; Commercial:
 * only their own), so exposing `commercial_id`/`commercial_name` here is
 * safe - it's never someone else's information.
 *
 * @mixin Property
 */
class DashboardPropertyResource extends JsonResource
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
            'transaction_type' => $this->transaction_type,
            'price_period' => $this->price_period,
            'approval_status' => $this->approval_status->value,
            'rejection_reason' => $this->rejection_reason,
            'commercial_id' => $this->commercial_id,
            'commercial_name' => $this->commercial?->name,
            'owner_contact_id' => $this->owner_contact_id,
            'city_id' => $this->city_id,
            'city_name' => $this->city?->translate('name'),
            'district_id' => $this->district_id,
            'district_name' => $this->district?->translate('name'),
            'address' => $this->address,
            'price' => $this->price / 100,
            'surface' => $this->surface,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'description' => $this->description,
            // Falls back to the original until the queued `medium`
            // conversion exists - see PropertyResource.
            'images' => $this->getMedia('gallery')->map(fn ($media) => [
                'id' => $media->id,
                'url' => $media->getAvailableUrl(['medium']),
            ])->values(),
            'cover_image' => $this->getFirstMediaUrl('gallery', 'medium') ?: null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
