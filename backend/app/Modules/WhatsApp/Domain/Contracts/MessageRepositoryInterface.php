<?php

namespace App\Modules\WhatsApp\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Support\Collection;

interface MessageRepositoryInterface extends RepositoryInterface
{
    /** The idempotency lookup webhook processing keys off of. */
    public function findByWaMessageId(string $waMessageId): ?Message;

    /**
     * The newest `$limit` messages of a conversation (optionally only those
     * older than `$beforeId`), returned oldest-first, plus whether more exist.
     *
     * @return array{messages: Collection<int, Message>, has_more: bool}
     */
    public function page(int $conversationId, ?int $beforeId, int $limit): array;

    /** The customer's most recent inbound message id in the thread, if any. */
    public function latestInboundWaMessageId(int $conversationId): ?string;
}
