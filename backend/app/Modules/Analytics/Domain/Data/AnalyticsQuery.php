<?php

namespace App\Modules\Analytics\Domain\Data;

use Carbon\CarbonImmutable;

/**
 * A resolved dashboard query: an absolute UTC window plus optional
 * filters. Every filter narrows the analysis to SESSIONS that match it (a
 * session from that source, on that device, that viewed that page or
 * property, that fired that event, or that engaged with that form).
 */
final readonly class AnalyticsQuery
{
    public function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $to,
        /** IANA timezone used for per-day buckets. */
        public string $timezone,
        public ?string $source = null,
        public ?string $device = null,
        public ?string $path = null,
        public ?int $propertyId = null,
        public ?string $eventType = null,
        public ?string $formType = null,
    ) {}

    public function hasSessionFilters(): bool
    {
        return $this->source !== null
            || $this->device !== null
            || $this->path !== null
            || $this->propertyId !== null
            || $this->eventType !== null
            || $this->formType !== null;
    }

    /** Whether the window reaches the present, so its numbers still change. */
    public function isLive(): bool
    {
        return $this->to->gte(CarbonImmutable::now()->subMinutes(5));
    }

    public function cacheKey(string $report, array $extra = []): string
    {
        return 'analytics:'.$report.':'.md5(json_encode([
            $this->from->getTimestamp(),
            // Live windows end at "now": bucket to the minute so the key is
            // stable across requests made within the cache TTL.
            $this->isLive() ? intdiv($this->to->getTimestamp(), 60) : $this->to->getTimestamp(),
            $this->timezone,
            $this->source,
            $this->device,
            $this->path,
            $this->propertyId,
            $this->eventType,
            $this->formType,
            $extra,
        ], JSON_THROW_ON_ERROR));
    }
}
