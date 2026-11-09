<?php

namespace App\Modules\Analytics\Domain\Enums;

/**
 * Every public form whose funnel is tracked. The values match the existing
 * business vocabulary (Lead's LeadType values for the lead forms) so the
 * dashboard reads the same way as the lead inboxes.
 */
enum TrackedForm: string
{
    case Contact = 'contact';
    case SellRequest = 'sell_request';
    case BuyRequest = 'buy_request';
    case RentRequest = 'rent_request';
    case VisitRequest = 'visit_request';
    case PropertyAlert = 'property_alert';
    case PartnerApplication = 'partner_application';
}
