<?php

namespace App\Modules\Lead\Domain\Enums;

/**
 * The kind of property a sell_request/rent_request lead describes - not to
 * be confused with the Property module's own `PropertyType` enum, which
 * classifies the property *catalog* (villa/riad/appartement/...). This one
 * is broader/lead-specific and drives which `property_details` fields the
 * public form shows (see the frontend's property-request-fields.ts).
 */
enum PropertyRequestType: string
{
    case Apartment = 'apartment';
    case HouseVilla = 'house_villa';
    case Riad = 'riad';
    case Land = 'land';
    case Commercial = 'commercial';
    case Office = 'office';
    case Shop = 'shop';
}
