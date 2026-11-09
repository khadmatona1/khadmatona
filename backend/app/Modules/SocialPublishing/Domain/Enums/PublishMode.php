<?php

namespace App\Modules\SocialPublishing\Domain\Enums;

enum PublishMode: string
{
    case Auto = 'auto';
    case Manual = 'manual';
}
