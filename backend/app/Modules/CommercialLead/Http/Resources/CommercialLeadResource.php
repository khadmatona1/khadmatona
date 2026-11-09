<?php

namespace App\Modules\CommercialLead\Http\Resources;

use App\Modules\CommercialLead\Domain\Models\CommercialLead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public-facing echo-back only - no internal `status` or other leads' data
 * is ever exposed through this unauthenticated endpoint.
 *
 * @mixin CommercialLead
 */
class CommercialLeadResource extends JsonResource
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
            'professional_type' => $this->professional_type->value,
            'created_at' => $this->created_at,
        ];
    }
}
