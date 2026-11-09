<?php

namespace App\Modules\WhatsApp\Http\Resources;

use App\Modules\WhatsApp\Domain\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Conversation
 */
class ConversationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'wa_id' => $this->wa_id,
            'phone' => $this->phone,
            'contact_name' => $this->contact_name,
            'lead_id' => $this->lead_id,
            'contact_id' => $this->contact_id,
            'assigned_user_id' => $this->assigned_user_id,
            'assigned_user_name' => $this->whenLoaded('assignedUser', fn () => $this->assignedUser?->name),
            'ai_enabled' => $this->ai_enabled,
            'unread_count' => $this->unread_count,
            'last_message_at' => $this->last_message_at,
            'last_message_preview' => $this->last_message_preview,
            'last_inbound_at' => $this->last_inbound_at,
            // Free-form replies are only allowed while this is true; after
            // it flips, only an approved template can be sent.
            'window_open' => $this->isWindowOpen(),
            'window_expires_at' => $this->windowExpiresAt(),
            'created_at' => $this->created_at,
        ];
    }
}
