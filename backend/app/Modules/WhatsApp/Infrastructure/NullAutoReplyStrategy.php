<?php

namespace App\Modules\WhatsApp\Infrastructure;

use App\Modules\WhatsApp\Domain\Contracts\AutoReplyStrategy;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Domain\Models\Message;

/** Default strategy: never replies. Swap it (see AutoReplyStrategy) to connect an AI. */
class NullAutoReplyStrategy implements AutoReplyStrategy
{
    public function reply(Conversation $conversation, Message $inbound): ?string
    {
        return null;
    }
}
