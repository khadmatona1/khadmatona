<?php

namespace App\Modules\WhatsApp\Domain\Models;

use App\Models\User;
use App\Modules\WhatsApp\Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One thread per customer WhatsApp number. `lead_id`/`contact_id` are bare
 * foreign keys to other business modules (no Eloquent relation -
 * PROJECT_RULES.md §3); `assigned_user_id` is a real relation because User is
 * Core/shared, not a business module.
 *
 * @use HasFactory<ConversationFactory>
 */
class Conversation extends Model
{
    /** @use HasFactory<ConversationFactory> */
    use HasFactory;

    /** WhatsApp's customer-service window: free-form replies allowed for 24h after the customer's last message. */
    public const WINDOW_HOURS = 24;

    protected $table = 'whatsapp_conversations';

    protected $fillable = [
        'wa_id',
        'phone',
        'contact_name',
        'lead_id',
        'contact_id',
        'assigned_user_id',
        'ai_enabled',
        'unread_count',
        'last_message_at',
        'last_inbound_at',
        'last_message_preview',
    ];

    protected function casts(): array
    {
        return [
            'ai_enabled' => 'boolean',
            'unread_count' => 'integer',
            'last_message_at' => 'datetime',
            'last_inbound_at' => 'datetime',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function windowExpiresAt(): ?Carbon
    {
        return $this->last_inbound_at?->copy()->addHours(self::WINDOW_HOURS);
    }

    public function isWindowOpen(): bool
    {
        return $this->windowExpiresAt()?->isFuture() ?? false;
    }

    protected static function newFactory(): ConversationFactory
    {
        return ConversationFactory::new();
    }
}
