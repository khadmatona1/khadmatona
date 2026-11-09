<?php

namespace App\Modules\WhatsApp\Domain\Enums;

enum MessageStatus: string
{
    /** Outbound, created locally, not yet accepted by Meta. */
    case Queued = 'queued';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Read = 'read';
    case Failed = 'failed';
    /** Inbound message stored. */
    case Received = 'received';

    /**
     * Delivery progress used to keep status updates monotonic - Meta's
     * webhooks can arrive out of order (a "delivered" after a "read").
     */
    public function rank(): int
    {
        return match ($this) {
            self::Queued, self::Received => 0,
            self::Sent => 1,
            self::Delivered => 2,
            self::Read => 3,
            self::Failed => 1,
        };
    }
}
