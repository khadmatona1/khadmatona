<?php

namespace App\Modules\Rental\Domain\Enums;

enum CleaningStatus: string
{
    case Pending = 'pending';
    case Done = 'done';
    case Cancelled = 'cancelled';
}
