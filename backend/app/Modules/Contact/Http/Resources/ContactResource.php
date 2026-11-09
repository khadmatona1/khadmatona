<?php

namespace App\Modules\Contact\Http\Resources;

use App\Modules\Contact\Domain\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Every route that returns this sits behind auth:sanctum +
 * role:Admin|Commercial|SeniorCommercial plus ContactFilter/ContactPolicy
 * scoping - there is no public-facing Contact resource, unlike Property.
 *
 * @mixin Contact
 */
class ContactResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'whatsapp' => $this->whatsapp,
            'address' => $this->address,
            'notes' => $this->notes,
            'commercial_id' => $this->commercial_id,
            'commercial_name' => $this->whenLoaded('commercial', fn () => $this->commercial?->name),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
