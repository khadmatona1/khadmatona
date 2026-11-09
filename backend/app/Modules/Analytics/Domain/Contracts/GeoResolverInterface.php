<?php

namespace App\Modules\Analytics\Domain\Contracts;

use App\Modules\Analytics\Domain\Data\GeoLocation;

/**
 * Approximate visitor location without ever storing or looking up a raw IP
 * address. The default implementation reads geo headers set by a trusted
 * reverse proxy/CDN, falling back to the browser's IANA timezone. A GeoIP
 * database implementation can be bound instead later without touching the
 * tracking pipeline.
 */
interface GeoResolverInterface
{
    public function resolve(?string $countryHeader, ?string $cityHeader, ?string $timezone): GeoLocation;
}
