<?php

namespace App\Modules\Visit\Domain\Enums;

enum VisitStatus: string
{
    case Scheduled = 'scheduled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';
}
