<?php

namespace App\Modules\Property\Domain\Enums;

enum PropertyStatus: string
{
    case Disponible = 'disponible';
    case Reserve = 'reserve';
    case Vendu = 'vendu';
    case Loue = 'loue';
}
