<?php

namespace App\Modules\WhatsApp\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\WhatsApp\Domain\Models\Conversation;

interface ConversationRepositoryInterface extends RepositoryInterface
{
    public function findByWaId(string $waId): ?Conversation;
}
