<?php

namespace App\Modules\Analytics\Domain\Data;

/**
 * One validated tracker request, carried from the HTTP layer into the
 * queued job. Holds only what analytics needs: the User-Agent string is
 * parsed into coarse buckets later, geo headers are raw proxy values, and
 * the client IP address is never part of it.
 */
final readonly class TrackingBatch
{
    /**
     * @param  array{landing_path?: ?string, referrer?: ?string, utm_source?: ?string, utm_medium?: ?string, utm_campaign?: ?string, utm_term?: ?string, utm_content?: ?string, timezone?: ?string, locale?: ?string}  $context
     * @param  array<int, array<string, mixed>>  $events
     */
    public function __construct(
        public string $visitorUuid,
        public string $sessionUuid,
        public int $receivedAtMs,
        public int $sentAtMs,
        public ?string $userAgent,
        public ?string $countryHeader,
        public ?string $cityHeader,
        public array $context,
        public array $events,
    ) {}
}
