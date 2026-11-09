<?php

namespace App\Modules\Analytics\Domain\Data;

final readonly class GeoLocation
{
    public function __construct(
        /** ISO 3166-1 alpha-2, uppercase. */
        public ?string $country,
        public ?string $city,
        /** "header" (proxy/CDN geo header) | "timezone" (approximate) | null */
        public ?string $source,
    ) {}

    public static function unknown(): self
    {
        return new self(null, null, null);
    }
}
