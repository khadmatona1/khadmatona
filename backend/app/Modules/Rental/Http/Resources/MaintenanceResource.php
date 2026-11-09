<?php

namespace App\Modules\Rental\Http\Resources;

use App\Modules\Rental\Domain\Models\MaintenanceRequest;
use App\Modules\Rental\Domain\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MaintenanceRequest
 */
class MaintenanceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rental_property_id' => $this->rental_property_id,
            'property_id' => $this->property_id,
            'property_title' => $this->property_title ?? null,
            'title' => $this->title,
            'description' => $this->description,
            'priority' => $this->priority->value,
            'status' => $this->status->value,
            'provider_name' => $this->provider_name,
            'reported_on' => $this->reported_on->toDateString(),
            'resolved_at' => $this->resolved_at,
            'cost' => Money::toMad($this->cost),
            'charged_to' => $this->charged_to->value,
        ];
    }
}
