<?php

namespace App\Modules\Visit\Http\Resources;

use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public-facing echo-back only, returned by the unauthenticated booking
 * endpoint - mirrors LeadResource's minimal shape.
 *
 * @mixin Visit
 */
class VisitConfirmationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'scheduled_at' => $this->scheduled_at,
            'created_at' => $this->created_at,
        ];
    }
}
