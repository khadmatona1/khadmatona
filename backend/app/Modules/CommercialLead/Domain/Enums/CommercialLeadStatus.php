<?php

namespace App\Modules\CommercialLead\Domain\Enums;

enum CommercialLeadStatus: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case Qualified = 'qualified';
    case Partner = 'partner';
    case Rejected = 'rejected';
}
