<?php

namespace App\Modules\Analytics\Domain\Contracts;

use App\Modules\Analytics\Domain\Data\AnalyticsQuery;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Read side of analytics. Every method is bounded by the query's time
 * window on an indexed timestamp column, so no report ever scans the whole
 * history. Results are plain arrays: the Application layer merges in lead
 * counts and property titles, then caches.
 */
interface AnalyticsReportRepositoryInterface
{
    /**
     * @return array{sessions: int, visitors: int, page_views: int, avg_session_seconds: int, bounce_rate: float, converted_sessions: int, form_submissions: int}
     */
    public function totals(AnalyticsQuery $query): array;

    /** Distinct visitors with a session started in the window (unfiltered). */
    public function uniqueVisitorsBetween(CarbonImmutable $from, CarbonImmutable $to): int;

    /**
     * @return array<string, array{visitors: int, sessions: int, page_views: int}> Keyed by local Y-m-d, every day in the window present.
     */
    public function dailySeries(AnalyticsQuery $query): array;

    /**
     * @return array<int, array{source: string, sessions: int, visitors: int, conversions: int}>
     */
    public function sources(AnalyticsQuery $query): array;

    /**
     * @return array<int, array{host: string, sessions: int}>
     */
    public function referrers(AnalyticsQuery $query, int $limit): array;

    /**
     * @return array<int, array{utm_source: ?string, utm_medium: ?string, utm_campaign: ?string, sessions: int, conversions: int}>
     */
    public function campaigns(AnalyticsQuery $query, int $limit): array;

    /**
     * Session counts grouped by one session column: device_type, browser, os or country.
     *
     * @return array<int, array{value: ?string, sessions: int}>
     */
    public function breakdown(AnalyticsQuery $query, string $column, int $limit): array;

    /**
     * @return array<int, array{path: string, page_type: string, views: int, visitors: int, avg_seconds: ?int, exits: int}>
     */
    public function topPages(AnalyticsQuery $query, int $limit): array;

    /**
     * @return array<int, array{path: string, exits: int, sessions_share: float}>
     */
    public function exitPages(AnalyticsQuery $query, int $limit): array;

    /**
     * @return array<int, array{property_id: int, views: int, visitors: int, avg_seconds: ?int, cta_clicks: int, contact_clicks: int, form_starts: int, form_submissions: int}>
     */
    public function topProperties(AnalyticsQuery $query, int $limit): array;

    /**
     * @return array<int, array{form_type: string, started: int, submitted: int, abandoned: int, in_progress: int, avg_seconds_to_submit: ?int, drop_off_fields: array<int, array{field: string, count: int}>, fields: array<int, array{field: string, interactions: int}>}>
     */
    public function forms(AnalyticsQuery $query, CarbonImmutable $abandonCutoff): array;

    /**
     * @return array{sessions: int, property_viewers: int, form_starters: int, converters: int}
     */
    public function funnel(AnalyticsQuery $query): array;

    /**
     * @return array<int, array{event_type: string, count: int, sessions: int}>
     */
    public function eventCounts(AnalyticsQuery $query): array;

    /**
     * Sessions (newest activity first), each with its ordered steps.
     */
    public function journeys(AnalyticsQuery $query, int $perPage, int $page): LengthAwarePaginator;

    /**
     * @return array{sessions: int, visitors: int, items: array<int, array<string, mixed>>}
     */
    public function online(CarbonImmutable $since, int $limit): array;
}
