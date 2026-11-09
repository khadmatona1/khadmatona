<?php

namespace App\Modules\Lead\Http\Resources;

use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public-facing echo-back only - no internal `status` or other leads'
 * data is ever exposed through this unauthenticated endpoint.
 *
 * @mixin Lead
 */
class LeadResource extends JsonResource
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
            'created_at' => $this->created_at,
        ];
    }
}
