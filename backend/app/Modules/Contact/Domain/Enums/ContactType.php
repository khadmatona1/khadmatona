<?php

namespace App\Modules\Contact\Domain\Enums;

enum ContactType: string
{
    case Buyer = 'buyer';
    case Seller = 'seller';
    case Tenant = 'tenant';
    case Landlord = 'landlord';
}
