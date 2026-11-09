<?php

namespace App\Modules\WhatsApp\Domain\Enums;

enum MessageSenderType: string
{
    /** The client, writing to our business number. */
    case Customer = 'customer';
    /** A staff member replying from the dashboard. */
    case Agent = 'agent';
    /** An automated reply produced by an AutoReplyStrategy. */
    case Ai = 'ai';
    case System = 'system';
}
