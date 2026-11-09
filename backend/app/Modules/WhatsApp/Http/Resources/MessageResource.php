<?php

namespace App\Modules\WhatsApp\Http\Resources;

use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Message
 */
class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'direction' => $this->direction->value,
            'sender_type' => $this->sender_type->value,
            'sender_user_id' => $this->sender_user_id,
            'sender_name' => $this->whenLoaded('senderUser', fn () => $this->senderUser?->name),
            'type' => $this->type,
            'body' => $this->body,
            // Media is fetched through the authenticated proxy endpoint
            // (Meta's own URLs expire in minutes and need our token), so
            // only the presence of an attachment is exposed here.
            'has_media' => $this->mediaId() !== null,
            'media_mime' => $this->mediaId() !== null ? ($this->payload['mime_type'] ?? null) : null,
            'media_filename' => $this->mediaId() !== null ? ($this->payload['filename'] ?? null) : null,
            'status' => $this->status->value,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'sent_at' => $this->sent_at,
            'delivered_at' => $this->delivered_at,
            'read_at' => $this->read_at,
            'occurred_at' => $this->occurred_at,
        ];
    }
}
