<?php

namespace App\Modules\CommercialLead\Http\Resources;

use App\Modules\CommercialLead\Domain\Models\CommercialLead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin-only view of a commercial lead - unlike CommercialLeadResource (the
 * public echo-back used by the unauthenticated capture endpoint), this
 * exposes every column. Only ever returned from routes behind
 * auth:sanctum + role:Admin.
 *
 * @mixin CommercialLead
 */
class AdminCommercialLeadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'company_name' => $this->company_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'whatsapp' => $this->whatsapp,
            'city' => $this->city,
            'address' => $this->address,
            'position' => $this->position,
            'professional_type' => $this->professional_type->value,
            'portfolio_size' => $this->portfolio_size,
            'property_types' => $this->property_types,
            'collaboration_type' => $this->collaboration_type,
            'message' => $this->message,
            'source' => $this->source,
            'status' => $this->status->value,
            'partner_user_id' => $this->partner_user_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
