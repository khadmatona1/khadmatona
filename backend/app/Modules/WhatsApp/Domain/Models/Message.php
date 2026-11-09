<?php

namespace App\Modules\WhatsApp\Domain\Models;

use App\Models\User;
use App\Modules\WhatsApp\Database\Factories\MessageFactory;
use App\Modules\WhatsApp\Domain\Enums\MessageDirection;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Enums\MessageStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-mostly record of every message in a conversation, inbound and
 * outbound - the dashboard's source of truth for conversation history.
 *
 * @use HasFactory<MessageFactory>
 */
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory;

    protected $table = 'whatsapp_messages';

    protected $fillable = [
        'conversation_id',
        'direction',
        'sender_type',
        'sender_user_id',
        'wa_message_id',
        'type',
        'body',
        'payload',
        'status',
        'error_code',
        'error_message',
        'sent_at',
        'delivered_at',
        'read_at',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'direction' => MessageDirection::class,
            'sender_type' => MessageSenderType::class,
            'status' => MessageStatus::class,
            'payload' => 'array',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'occurred_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function senderUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    public function isInbound(): bool
    {
        return $this->direction === MessageDirection::Inbound;
    }

    /** Media id Meta assigned to an attachment, if this message has one. */
    public function mediaId(): ?string
    {
        $id = $this->payload['id'] ?? null;

        return in_array($this->type, ['image', 'video', 'audio', 'document', 'sticker'], true) && is_string($id)
            ? $id
            : null;
    }

    protected static function newFactory(): MessageFactory
    {
        return MessageFactory::new();
    }
}
