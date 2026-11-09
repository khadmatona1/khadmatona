<?php

namespace App\Modules\Property\Domain\Enums;

enum PropertyType: string
{
    case Appartement = 'appartement';
    case Villa = 'villa';
    case Riad = 'riad';
    case Maison = 'maison';
    case Terrain = 'terrain';
    case Bureau = 'bureau';
    case Local = 'local';
}
