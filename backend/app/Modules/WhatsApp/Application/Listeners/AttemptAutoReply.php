<?php

namespace App\Modules\WhatsApp\Application\Listeners;

use App\Modules\WhatsApp\Application\WhatsAppMessenger;
use App\Modules\WhatsApp\Domain\Contracts\AutoReplyStrategy;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Events\WhatsAppMessageReceived;
use App\Modules\WhatsApp\Domain\Exceptions\ConversationWindowClosedException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

/**
 * The AI/bot hook. Does nothing unless BOTH the global switch
 * (WHATSAPP_AI_ENABLED) and the conversation's own `ai_enabled` flag are on
 * AND the bound AutoReplyStrategy returns text - so with the default
 * NullAutoReplyStrategy, and until someone opts a conversation in, this is
 * inert. Replies are sent (and stored) as sender_type `ai`.
 */
class AttemptAutoReply implements ShouldQueue
{
    public function __construct(
        private readonly AutoReplyStrategy $strategy,
        private readonly WhatsAppMessenger $messenger,
    ) {}

    public function handle(WhatsAppMessageReceived $event): void
    {
        $message = $event->message;
        $conversation = $message->conversation;

        if (! config('services.whatsapp.ai_enabled') || ! $conversation->ai_enabled) {
            return;
        }

        $reply = $this->strategy->reply($conversation, $message);

        if (blank($reply)) {
            return;
        }

        try {
            $this->messenger->sendText($conversation, $reply, MessageSenderType::Ai);
        } catch (WhatsAppNotConfiguredException|ConversationWindowClosedException|WhatsAppRequestFailedException $e) {
            // The failed attempt is already stored on the thread; nothing to retry blindly.
            Log::warning('whatsapp.auto_reply_failed', ['conversation_id' => $conversation->id, 'reason' => $e->getMessage()]);
        }
    }
}
