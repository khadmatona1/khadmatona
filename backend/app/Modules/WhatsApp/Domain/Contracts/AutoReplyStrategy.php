<?php

namespace App\Modules\WhatsApp\Domain\Contracts;

use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Domain\Models\Message;

/**
 * The seam for connecting an AI (or any bot) later: given a conversation
 * and the customer's new message, return the text to send back, or null to
 * stay silent. Bound to a do-nothing implementation by default
 * (Infrastructure\NullAutoReplyStrategy) - to plug an AI in, write a class
 * implementing this and bind it in WhatsAppServiceProvider, then set
 * WHATSAPP_AI_ENABLED=true and switch on `ai_enabled` per conversation.
 */
interface AutoReplyStrategy
{
    public function reply(Conversation $conversation, Message $inbound): ?string;
}
