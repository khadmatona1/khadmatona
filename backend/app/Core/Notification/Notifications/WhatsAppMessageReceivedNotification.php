<?php

namespace App\Core\Notification\Notifications;

use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * "A customer wrote to us on WhatsApp" - dashboard bell only (mail would be
 * far too noisy for chat). The payload carries just enough for the bell to
 * render a line and open the conversation.
 */
class WhatsAppMessageReceivedNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(private readonly Message $message) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $conversation = $this->message->conversation;

        return [
            'type' => 'whatsapp_message',
            'conversation_id' => $conversation->id,
            'contact_name' => $conversation->contact_name,
            'phone' => $conversation->phone,
            'preview' => Str::limit($this->message->body ?: "[{$this->message->type}]", 100),
        ];
    }
}
