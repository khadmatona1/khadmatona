<?php

namespace App\Modules\SocialPublishing\Domain\Enums;

enum SocialAccountStatus: string
{
    case Connected = 'connected';
    case NeedsReconnect = 'needs_reconnect';
}
