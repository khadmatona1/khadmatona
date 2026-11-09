<?php

namespace App\Modules\Rental\Domain\Enums;

enum MaintenancePriority: string
{
    case Low = 'low';
    case Normal = 'normal';
    case Urgent = 'urgent';
}
