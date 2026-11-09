<?php

namespace App\Modules\WhatsApp\Database\Factories;

use App\Modules\WhatsApp\Domain\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $waId = '2126'.fake()->unique()->numerify('########');

        return [
            'wa_id' => $waId,
            'phone' => '+'.$waId,
            'contact_name' => fake()->name(),
            'unread_count' => 0,
            'last_message_at' => now(),
            'last_inbound_at' => now(),
        ];
    }

    /** The customer last wrote more than 24h ago - free-form replies are blocked. */
    public function windowClosed(): static
    {
        return $this->state(fn () => ['last_inbound_at' => now()->subHours(30)]);
    }
}
