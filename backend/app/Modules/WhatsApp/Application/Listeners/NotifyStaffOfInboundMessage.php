<?php

namespace App\Modules\WhatsApp\Application\Listeners;

use App\Core\Notification\Notifications\WhatsAppMessageReceivedNotification;
use App\Models\User;
use App\Modules\WhatsApp\Domain\Events\WhatsAppMessageReceived;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

/**
 * Puts a new inbound message on the dashboard bell of whoever owns the
 * thread (every Admin when it's unassigned). Only the FIRST unread message
 * of a burst notifies - a chatty customer must not flood the bell; opening
 * the conversation clears it.
 */
class NotifyStaffOfInboundMessage implements ShouldQueue
{
    public function handle(WhatsAppMessageReceived $event): void
    {
        $conversation = $event->message->conversation;

        if ($conversation->unread_count > 1) {
            return;
        }

        $recipients = $conversation->assigned_user_id
            ? User::whereKey($conversation->assigned_user_id)->where('is_active', true)->get()
            : User::role('Admin')->get();

        if ($recipients->isEmpty()) {
            $recipients = User::role('Admin')->get();
        }

        Notification::send($recipients, new WhatsAppMessageReceivedNotification($event->message));
    }
}
