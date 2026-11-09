<?php

namespace App\Modules\Rental\Domain\Enums;

/**
 * Who bears a cost in the owner / KHADMATONA split.
 */
enum ChargedTo: string
{
    case Owner = 'owner';
    case Khadmatona = 'khadmatona';
}
