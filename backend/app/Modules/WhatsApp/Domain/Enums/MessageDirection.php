<?php

namespace App\Modules\WhatsApp\Domain\Enums;

enum MessageDirection: string
{
    case Inbound = 'inbound';
    case Outbound = 'outbound';
}
