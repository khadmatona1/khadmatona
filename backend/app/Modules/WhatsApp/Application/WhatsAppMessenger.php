<?php

namespace App\Modules\WhatsApp\Application;

use App\Models\User;
use App\Modules\WhatsApp\Domain\Contracts\ConversationRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\MessageRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Enums\MessageDirection;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Enums\MessageStatus;
use App\Modules\WhatsApp\Domain\Exceptions\ConversationWindowClosedException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Support\Str;

/**
 * The single place outbound messages are sent from - dashboard replies, the
 * template that opens a new thread, and AI auto-replies all go through here,
 * so every one is stored in the conversation history the same way.
 *
 * The message row is written BEFORE calling Meta (status `queued`) and then
 * updated, so a Meta failure still leaves a visible `failed` message with
 * the reason instead of silently vanishing from the history.
 */
class WhatsAppMessenger
{
    public function __construct(
        private readonly WhatsAppGateway $gateway,
        private readonly MessageRepositoryInterface $messages,
        private readonly ConversationRepositoryInterface $conversations,
    ) {}

    /**
     * Free-form text - only allowed within 24h of the customer's last message.
     *
     * @throws WhatsAppNotConfiguredException
     * @throws ConversationWindowClosedException
     * @throws WhatsAppRequestFailedException
     */
    public function sendText(Conversation $conversation, string $body, MessageSenderType $sender, ?User $user = null): Message
    {
        $this->ensureConfigured();

        if (! $conversation->isWindowOpen()) {
            throw ConversationWindowClosedException::make();
        }

        return $this->deliver(
            $conversation,
            ['type' => 'text', 'body' => $body, 'payload' => null],
            $sender,
            $user,
            fn () => $this->gateway->sendText($conversation->wa_id, $body),
        );
    }

    /**
     * An approved template - the only thing WhatsApp allows outside the 24h
     * window, and the only way to open a conversation with a customer.
     *
     * @param  array<int, string>  $params
     *
     * @throws WhatsAppNotConfiguredException
     * @throws WhatsAppRequestFailedException
     */
    public function sendTemplate(Conversation $conversation, string $name, string $language, array $params, MessageSenderType $sender, ?User $user = null): Message
    {
        $this->ensureConfigured();

        return $this->deliver(
            $conversation,
            [
                'type' => 'template',
                'body' => trim("[{$name}] ".implode(' | ', $params)),
                'payload' => ['name' => $name, 'language' => $language, 'params' => array_values($params)],
            ],
            $sender,
            $user,
            fn () => $this->gateway->sendTemplate($conversation->wa_id, $name, $language, $params),
        );
    }

    /**
     * @param  array{type: string, body: string, payload: ?array<string, mixed>}  $content
     * @param  callable(): array{id: string}  $send
     */
    private function deliver(Conversation $conversation, array $content, MessageSenderType $sender, ?User $user, callable $send): Message
    {
        /** @var Message $message */
        $message = $this->messages->create([
            'conversation_id' => $conversation->id,
            'direction' => MessageDirection::Outbound,
            'sender_type' => $sender,
            'sender_user_id' => $user?->id,
            'type' => $content['type'],
            'body' => $content['body'],
            'payload' => $content['payload'],
            'status' => MessageStatus::Queued,
            'occurred_at' => now(),
        ]);

        try {
            $result = $send();
        } catch (WhatsAppRequestFailedException $e) {
            $this->messages->update($message, [
                'status' => MessageStatus::Failed,
                'error_code' => $e->metaCode() !== null ? (string) $e->metaCode() : null,
                'error_message' => $e->getMessage(),
            ]);
            $this->touch($conversation, $content);

            throw $e;
        }

        $this->messages->update($message, [
            'wa_message_id' => $result['id'],
            'status' => MessageStatus::Sent,
            'sent_at' => now(),
        ]);
        $this->touch($conversation, $content);

        return $message->refresh();
    }

    /**
     * @param  array{type: string, body: string, payload: ?array<string, mixed>}  $content
     */
    private function touch(Conversation $conversation, array $content): void
    {
        $this->conversations->update($conversation, [
            'last_message_at' => now(),
            'last_message_preview' => Str::limit($content['body'], 100),
        ]);
    }

    private function ensureConfigured(): void
    {
        if (! $this->gateway->isConfigured()) {
            throw WhatsAppNotConfiguredException::make();
        }
    }
}
