<?php

namespace App\Modules\WhatsApp\Domain\Events;

use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired once for every new inbound customer message, after it's stored.
 * Anything reacting to inbound messages (auto-reply/AI, notifications,
 * analytics) listens to this instead of being wired into the webhook code.
 */
class WhatsAppMessageReceived
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Message $message) {}
}
