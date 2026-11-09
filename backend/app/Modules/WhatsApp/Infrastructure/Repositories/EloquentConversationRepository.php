<?php

namespace App\Modules\WhatsApp\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\WhatsApp\Domain\Contracts\ConversationRepositoryInterface;
use App\Modules\WhatsApp\Domain\Models\Conversation;

class EloquentConversationRepository extends BaseRepository implements ConversationRepositoryInterface
{
    protected function model(): string
    {
        return Conversation::class;
    }

    public function findByWaId(string $waId): ?Conversation
    {
        return Conversation::where('wa_id', $waId)->first();
    }
}
