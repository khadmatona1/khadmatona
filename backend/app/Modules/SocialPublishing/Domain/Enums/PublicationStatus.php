<?php

namespace App\Modules\SocialPublishing\Domain\Enums;

enum PublicationStatus: string
{
    case Pending = 'pending';
    case Publishing = 'publishing';
    case Published = 'published';
    case Failed = 'failed';
}
