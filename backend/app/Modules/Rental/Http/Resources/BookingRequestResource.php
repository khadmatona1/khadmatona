<?php

namespace App\Modules\Rental\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'reference' => $this->reference, 'property_id' => $this->property_id,
            'property_title' => $this->property_title, 'guest_name' => $this->guest_name,
            'guest_phone' => $this->guest_phone, 'guest_email' => $this->guest_email,
            'guests_count' => $this->guests_count, 'check_in_date' => $this->check_in_date->toDateString(),
            'check_out_date' => $this->check_out_date->toDateString(), 'notes' => $this->notes,
            'status' => $this->status, 'reservation_id' => $this->reservation_id, 'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
