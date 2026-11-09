<?php

namespace App\Modules\WhatsApp\Database\Factories;

use App\Modules\WhatsApp\Domain\Enums\MessageDirection;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Enums\MessageStatus;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'direction' => MessageDirection::Inbound,
            'sender_type' => MessageSenderType::Customer,
            'wa_message_id' => 'wamid.'.fake()->unique()->regexify('[A-Za-z0-9]{24}'),
            'type' => 'text',
            'body' => fake()->sentence(),
            'status' => MessageStatus::Received,
            'occurred_at' => now(),
        ];
    }

    public function outbound(): static
    {
        return $this->state(fn () => [
            'direction' => MessageDirection::Outbound,
            'sender_type' => MessageSenderType::Agent,
            'status' => MessageStatus::Sent,
            'sent_at' => now(),
        ]);
    }
}
