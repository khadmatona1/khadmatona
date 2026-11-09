<?php

namespace App\Modules\Rental\Http\Resources;

use App\Modules\Rental\Domain\Models\Cleaning;
use App\Modules\Rental\Domain\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cleaning
 */
class CleaningResource extends JsonResource
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
            'reservation_id' => $this->reservation_id,
            'scheduled_for' => $this->scheduled_for->toDateString(),
            'status' => $this->status->value,
            'cleaner_name' => $this->cleaner_name,
            'cost' => Money::toMad($this->cost),
            'charged_to' => $this->charged_to->value,
            'completed_at' => $this->completed_at,
            'notes' => $this->notes,
        ];
    }
}
