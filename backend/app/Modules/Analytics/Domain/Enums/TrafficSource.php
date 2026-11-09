<?php

namespace App\Modules\Analytics\Domain\Enums;

enum TrafficSource: string
{
    case Direct = 'direct';
    case Google = 'google';
    case Facebook = 'facebook';
    case Instagram = 'instagram';
    case TikTok = 'tiktok';
    case OtherSearch = 'other_search';
    case OtherSocial = 'other_social';
    case Email = 'email';
    case Referral = 'referral';
}
