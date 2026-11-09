<?php

namespace App\Modules\Analytics\Domain\Enums;

enum FormSessionStatus: string
{
    case Started = 'started';
    case Submitted = 'submitted';
    case Abandoned = 'abandoned';
}
