<?php

namespace App\Modules\PropertyAlert\Http\Resources;

use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PropertyAlert
 */
class PropertyAlertResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'phone' => $this->phone_e164,
            'city_id' => $this->city_id,
            'city_name' => $this->whenLoaded('city', fn () => $this->city?->translate('name')),
            'district_id' => $this->district_id,
            'district_name' => $this->whenLoaded('district', fn () => $this->district?->translate('name')),
            'transaction_type' => $this->transaction_type,
            'price_period' => $this->price_period,
            'property_type' => $this->property_type,
            // Stored as integer cents - converted to MAD here, same
            // boundary as PropertyResource.
            'budget_max' => $this->budget_max !== null ? $this->budget_max / 100 : null,
            'surface_min' => $this->surface_min,
            'surface_max' => $this->surface_max,
            'created_at' => $this->created_at,
        ];
    }
}
