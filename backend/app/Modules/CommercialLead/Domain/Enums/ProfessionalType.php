<?php

namespace App\Modules\CommercialLead\Domain\Enums;

enum ProfessionalType: string
{
    case IndependentAgent = 'independent_agent';
    case Agency = 'agency';
    case Commercial = 'commercial';
    case Developer = 'developer';
    case Other = 'other';
}
