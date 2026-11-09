<?php

namespace App\Modules\Rental\Http\Resources;

use App\Modules\Rental\Domain\Models\ManagedProperty;
use App\Modules\Rental\Domain\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ManagedProperty
 */
class ManagedPropertyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'property_title' => $this->property_title ?? null,
            'commission_rate' => Money::basisPointsToPercent($this->commission_rate_bp),
            'cleaning_fee' => Money::toMad($this->cleaning_fee),
            'cleaning_charged_to' => $this->cleaning_charged_to->value,
            'is_active' => $this->is_active,
            'approval_status' => $this->approval_status,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
