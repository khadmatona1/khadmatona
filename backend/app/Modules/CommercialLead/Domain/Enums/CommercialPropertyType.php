<?php

namespace App\Modules\CommercialLead\Domain\Enums;

/**
 * The kinds of property a partner's portfolio may include - distinct from
 * the Property module's own `PropertyType` enum (which classifies the
 * catalog), same reasoning as Lead's own `PropertyRequestType` enum.
 */
enum CommercialPropertyType: string
{
    case Apartments = 'apartments';
    case Villas = 'villas';
    case Houses = 'houses';
    case Land = 'land';
    case CommercialPremises = 'commercial_premises';
    case Other = 'other';
}
