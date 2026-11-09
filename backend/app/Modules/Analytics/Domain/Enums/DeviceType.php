<?php

namespace App\Modules\Analytics\Domain\Enums;

enum DeviceType: string
{
    case Desktop = 'desktop';
    case Mobile = 'mobile';
    case Tablet = 'tablet';
}
