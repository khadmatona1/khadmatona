<?php

namespace App\Modules\Analytics\Infrastructure\Geo;

use App\Modules\Analytics\Domain\Contracts\GeoResolverInterface;
use App\Modules\Analytics\Domain\Data\GeoLocation;
use DateTimeZone;
use Throwable;

class HeaderGeoResolver implements GeoResolverInterface
{
    /** Cloudflare's placeholders for "unknown" and "Tor exit node". */
    private const INVALID_COUNTRIES = ['XX', 'T1'];

    public function resolve(?string $countryHeader, ?string $cityHeader, ?string $timezone): GeoLocation
    {
        $country = $this->validCountry($countryHeader);

        if ($country !== null) {
            return new GeoLocation($country, $this->validCity($cityHeader), 'header');
        }

        $country = $this->countryFromTimezone($timezone);

        // A city is never inferred from a timezone: "Africa/Casablanca"
        // covers the whole country, and presenting it as a city would be
        // wrong for most Moroccan visitors.
        return $country !== null ? new GeoLocation($country, null, 'timezone') : GeoLocation::unknown();
    }

    private function validCountry(?string $value): ?string
    {
        $value = strtoupper(trim((string) $value));

        return preg_match('/^[A-Z]{2}$/', $value) === 1 && ! in_array($value, self::INVALID_COUNTRIES, true) ? $value : null;
    }

    private function validCity(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        // Some proxies URL-encode non-ASCII city names ("F%C3%A8s").
        $value = rawurldecode($value);

        return preg_match('/^[\p{L}\p{M}\s\'.\-]{1,100}$/u', $value) === 1 ? $value : null;
    }

    private function countryFromTimezone(?string $timezone): ?string
    {
        if ($timezone === null || $timezone === '' || ! in_array($timezone, DateTimeZone::listIdentifiers(), true)) {
            return null;
        }

        try {
            $code = (new DateTimeZone($timezone))->getLocation()['country_code'] ?? null;
        } catch (Throwable) {
            return null;
        }

        return is_string($code) ? $this->validCountry($code) : null;
    }
}
