<?php

namespace App\Modules\Lead\Domain\Enums;

enum LeadType: string
{
    case VisitRequest = 'visit_request';
    case SellRequest = 'sell_request';
    case BuyRequest = 'buy_request';
    case RentRequest = 'rent_request';
    case Contact = 'contact';
}
