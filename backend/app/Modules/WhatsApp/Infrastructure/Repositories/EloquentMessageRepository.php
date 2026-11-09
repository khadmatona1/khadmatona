<?php

namespace App\Modules\WhatsApp\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\WhatsApp\Domain\Contracts\MessageRepositoryInterface;
use App\Modules\WhatsApp\Domain\Enums\MessageDirection;
use App\Modules\WhatsApp\Domain\Models\Message;

class EloquentMessageRepository extends BaseRepository implements MessageRepositoryInterface
{
    protected function model(): string
    {
        return Message::class;
    }

    public function findByWaMessageId(string $waMessageId): ?Message
    {
        return Message::where('wa_message_id', $waMessageId)->first();
    }

    public function page(int $conversationId, ?int $beforeId, int $limit): array
    {
        $rows = Message::with('senderUser')
            ->where('conversation_id', $conversationId)
            ->when($beforeId !== null, fn ($q) => $q->where('id', '<', $beforeId))
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        return [
            'messages' => $rows->take($limit)->reverse()->values(),
            'has_more' => $rows->count() > $limit,
        ];
    }

    public function latestInboundWaMessageId(int $conversationId): ?string
    {
        return Message::where('conversation_id', $conversationId)
            ->where('direction', MessageDirection::Inbound->value)
            ->whereNotNull('wa_message_id')
            ->orderByDesc('id')
            ->value('wa_message_id');
    }
}
