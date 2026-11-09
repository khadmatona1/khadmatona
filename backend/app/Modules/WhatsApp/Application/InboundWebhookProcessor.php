<?php

namespace App\Modules\WhatsApp\Application;

use App\Modules\WhatsApp\Domain\Contracts\ConversationRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\MessageRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Enums\MessageDirection;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Enums\MessageStatus;
use App\Modules\WhatsApp\Domain\Events\WhatsAppMessageReceived;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Turns one Meta webhook payload into stored history: new customer messages
 * become inbound Message rows (creating/linking the conversation), and
 * delivery receipts advance the status of messages we sent.
 *
 * Meta retries deliveries and can send them out of order, so everything here
 * is idempotent (a message id is only stored once) and status updates only
 * ever move forward.
 */
class InboundWebhookProcessor
{
    public function __construct(
        private readonly WhatsAppGateway $gateway,
        private readonly ConversationService $conversationService,
        private readonly ConversationRepositoryInterface $conversations,
        private readonly MessageRepositoryInterface $messages,
    ) {}

    /**
     * @param  array<string, mixed>  $payload  The decoded webhook body.
     */
    public function process(array $payload): void
    {
        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                if (($change['field'] ?? null) !== 'messages') {
                    continue;
                }

                $value = $change['value'] ?? [];
                $phoneNumberId = $value['metadata']['phone_number_id'] ?? null;

                // The app may be subscribed for several numbers; only handle ours.
                if ($this->gateway->phoneNumberId() !== null && $phoneNumberId !== $this->gateway->phoneNumberId()) {
                    Log::info('whatsapp.webhook.ignored_other_number', ['phone_number_id' => $phoneNumberId]);

                    continue;
                }

                $names = collect($value['contacts'] ?? [])
                    ->mapWithKeys(fn (array $c) => [(string) ($c['wa_id'] ?? '') => $c['profile']['name'] ?? null]);

                foreach ($value['messages'] ?? [] as $raw) {
                    $this->storeInbound($raw, $names->all());
                }

                foreach ($value['statuses'] ?? [] as $raw) {
                    $this->applyStatus($raw);
                }
            }
        }
    }

    /**
     * @param  array<string, mixed>  $raw
     * @param  array<string, ?string>  $names
     */
    private function storeInbound(array $raw, array $names): void
    {
        $waMessageId = $raw['id'] ?? null;
        $from = preg_replace('/\D/', '', (string) ($raw['from'] ?? ''));

        if (! is_string($waMessageId) || $waMessageId === '' || $from === '') {
            return;
        }

        if ($this->messages->findByWaMessageId($waMessageId)) {
            return; // duplicate delivery
        }

        $conversation = $this->conversationService->findOrCreate($from, $names[$from] ?? null);
        $type = (string) ($raw['type'] ?? 'unsupported');
        [$body, $payload] = $this->extract($type, $raw);
        $occurredAt = isset($raw['timestamp']) ? Carbon::createFromTimestamp((int) $raw['timestamp']) : now();

        try {
            /** @var Message $message */
            $message = $this->messages->create([
                'conversation_id' => $conversation->id,
                'direction' => MessageDirection::Inbound,
                'sender_type' => MessageSenderType::Customer,
                'wa_message_id' => $waMessageId,
                'type' => $type,
                'body' => $body,
                'payload' => $payload,
                'status' => MessageStatus::Received,
                'occurred_at' => $occurredAt,
            ]);
        } catch (UniqueConstraintViolationException) {
            return; // lost a race with a concurrent delivery of the same message
        }

        // Keep the newest timestamps if messages arrive out of order.
        $this->conversations->update($conversation, [
            'last_message_at' => $conversation->last_message_at?->gt($occurredAt) ? $conversation->last_message_at : $occurredAt,
            'last_inbound_at' => $conversation->last_inbound_at?->gt($occurredAt) ? $conversation->last_inbound_at : $occurredAt,
            'last_message_preview' => Str::limit($body ?: "[{$type}]", 100),
            'unread_count' => $conversation->unread_count + 1,
        ]);

        Log::info('whatsapp.message.received', [
            'conversation_id' => $conversation->id,
            'message_id' => $message->id,
            'type' => $type,
        ]);

        WhatsAppMessageReceived::dispatch($message);
    }

    /**
     * @param  array<string, mixed>  $raw
     */
    private function applyStatus(array $raw): void
    {
        $waMessageId = $raw['id'] ?? null;
        $status = MessageStatus::tryFrom((string) ($raw['status'] ?? ''));

        // Meta also sends statuses we don't model (e.g. "deleted"); ignore them.
        if (! is_string($waMessageId) || ! in_array($status, [MessageStatus::Sent, MessageStatus::Delivered, MessageStatus::Read, MessageStatus::Failed], true)) {
            return;
        }

        $message = $this->messages->findByWaMessageId($waMessageId);

        if (! $message || $message->direction !== MessageDirection::Outbound) {
            Log::info('whatsapp.status.unknown_message', ['status' => $status?->value]);

            return;
        }

        $at = isset($raw['timestamp']) ? Carbon::createFromTimestamp((int) $raw['timestamp']) : now();
        $current = $message->status;

        if ($status === MessageStatus::Failed) {
            // A message that already reached the customer can't have failed.
            if ($current->rank() >= MessageStatus::Delivered->rank()) {
                return;
            }

            $error = $raw['errors'][0] ?? [];
            $this->messages->update($message, [
                'status' => MessageStatus::Failed,
                'error_code' => isset($error['code']) ? (string) $error['code'] : null,
                'error_message' => $error['error_data']['details'] ?? $error['message'] ?? $error['title'] ?? null,
            ]);

            return;
        }

        if ($status->rank() <= $current->rank() && $current !== MessageStatus::Failed) {
            return; // stale/out-of-order update
        }

        $updates = ['status' => $status, 'error_code' => null, 'error_message' => null];
        $updates['sent_at'] = $message->sent_at ?? $at;

        if ($status->rank() >= MessageStatus::Delivered->rank()) {
            $updates['delivered_at'] = $message->delivered_at ?? $at;
        }

        if ($status === MessageStatus::Read) {
            $updates['read_at'] = $message->read_at ?? $at;
        }

        $this->messages->update($message, $updates);
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array{0: ?string, 1: ?array<string, mixed>}
     */
    private function extract(string $type, array $raw): array
    {
        $body = null;
        $payload = null;

        switch ($type) {
            case 'text':
                $body = $raw['text']['body'] ?? null;
                break;

            case 'image':
            case 'video':
            case 'audio':
            case 'document':
            case 'sticker':
                $media = $raw[$type] ?? [];
                $body = $media['caption'] ?? null;
                $payload = array_filter([
                    'id' => $media['id'] ?? null,
                    'mime_type' => $media['mime_type'] ?? null,
                    'filename' => $media['filename'] ?? null,
                    'voice' => $media['voice'] ?? null,
                ], fn ($v) => $v !== null);
                break;

            case 'location':
                $location = $raw['location'] ?? [];
                $body = trim(($location['name'] ?? '').' '.($location['address'] ?? '')) ?: null;
                $payload = array_filter([
                    'latitude' => $location['latitude'] ?? null,
                    'longitude' => $location['longitude'] ?? null,
                ], fn ($v) => $v !== null);
                break;

            case 'button':
                $body = $raw['button']['text'] ?? null;
                break;

            case 'interactive':
                $reply = $raw['interactive']['button_reply'] ?? $raw['interactive']['list_reply'] ?? [];
                $body = $reply['title'] ?? null;
                break;

            case 'reaction':
                $body = $raw['reaction']['emoji'] ?? null;
                $payload = ['reacted_to' => $raw['reaction']['message_id'] ?? null];
                break;

            case 'contacts':
                $body = collect($raw['contacts'] ?? [])->pluck('name.formatted_name')->filter()->implode(', ') ?: null;
                break;
        }

        // Customer replied to one of our (or their own) earlier messages.
        if (isset($raw['context']['id'])) {
            $payload = ($payload ?? []) + ['reply_to' => $raw['context']['id']];
        }

        return [$body, $payload === [] ? null : $payload];
    }
}
