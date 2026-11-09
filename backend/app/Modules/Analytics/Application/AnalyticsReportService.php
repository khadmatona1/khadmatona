<?php

namespace App\Modules\Analytics\Application;

use App\Modules\Analytics\Domain\Contracts\AnalyticsReportRepositoryInterface;
use App\Modules\Analytics\Domain\Data\AnalyticsQuery;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Cache\Repository as Cache;

/**
 * Builds the Admin analytics reports. Behavioral data comes from this
 * module's own tables. "Leads generated" comes from the Lead module (the
 * business source of truth) and property titles from the Property module,
 * both through their Domain repository contracts (PROJECT_RULES.md §3),
 * never their models.
 *
 * Every report is cached per filter set: briefly when the window reaches
 * the present, much longer for closed historical windows. Opening the
 * dashboard therefore never re-runs the same aggregation on every load.
 */
class AnalyticsReportService
{
    public const RANGES = ['today', 'yesterday', '7d', '30d', 'custom'];

    public function __construct(
        private readonly AnalyticsReportRepositoryInterface $reports,
        private readonly LeadRepositoryInterface $leads,
        private readonly PropertyRepositoryInterface $properties,
        private readonly Cache $cache,
    ) {}

    /**
     * @param  array<string, mixed>  $input  Validated AnalyticsReportRequest data.
     */
    public function resolveQuery(array $input): AnalyticsQuery
    {
        $timezone = (string) config('analytics.timezone');
        $now = CarbonImmutable::now($timezone);
        $today = $now->startOfDay();

        [$from, $to] = match ($input['range'] ?? '7d') {
            'today' => [$today, $now],
            'yesterday' => [$today->subDay(), $today->subSecond()],
            '30d' => [$today->subDays(29), $now],
            'custom' => [
                CarbonImmutable::createFromFormat('Y-m-d', (string) $input['from'], $timezone)->startOfDay(),
                min(CarbonImmutable::createFromFormat('Y-m-d', (string) $input['to'], $timezone)->endOfDay(), $now),
            ],
            default => [$today->subDays(6), $now],
        };

        return new AnalyticsQuery(
            from: $from->utc(),
            to: $to->utc(),
            timezone: $timezone,
            source: $input['source'] ?? null,
            device: $input['device'] ?? null,
            path: $input['page'] ?? null,
            propertyId: isset($input['property_id']) ? (int) $input['property_id'] : null,
            eventType: $input['event'] ?? null,
            formType: $input['form'] ?? null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function overview(AnalyticsQuery $query): array
    {
        return $this->remember('overview', $query, function () use ($query) {
            $totals = $this->reports->totals($query);
            $leadsByDay = $this->leadsByLocalDay($query);

            $series = [];
            foreach ($this->reports->dailySeries($query) as $day => $point) {
                $series[] = ['date' => $day, ...$point, 'leads' => $leadsByDay[$day] ?? 0];
            }

            return [
                'range' => $this->rangeMeta($query),
                'cards' => [
                    ...$this->visitorCards($query->timezone),
                    'sessions' => $totals['sessions'],
                    'visitors' => $totals['visitors'],
                    'page_views' => $totals['page_views'],
                    'avg_session_seconds' => $totals['avg_session_seconds'],
                    'bounce_rate' => $totals['bounce_rate'],
                    // The Lead module's own count for the window: every lead,
                    // whatever the channel, and not narrowed by analytics
                    // filters (a lead row has no source/device).
                    'leads' => $this->leads->countCreatedBetween($query->from, $query->to),
                    'form_submissions' => $totals['form_submissions'],
                    'converted_sessions' => $totals['converted_sessions'],
                    'conversion_rate' => $this->rate($totals['converted_sessions'], $totals['sessions']),
                ],
                'series' => $series,
                'sources' => $this->reports->sources($query),
                'devices' => $this->reports->breakdown($query, 'device_type', 5),
                'funnel' => $this->reports->funnel($query),
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function sources(AnalyticsQuery $query): array
    {
        return $this->remember('sources', $query, fn () => [
            'range' => $this->rangeMeta($query),
            'sources' => array_map(fn (array $row) => $row + [
                'conversion_rate' => $this->rate($row['conversions'], $row['sessions']),
            ], $this->reports->sources($query)),
            'referrers' => $this->reports->referrers($query, 15),
            'campaigns' => array_map(fn (array $row) => $row + [
                'conversion_rate' => $this->rate($row['conversions'], $row['sessions']),
            ], $this->reports->campaigns($query, 20)),
            'devices' => $this->reports->breakdown($query, 'device_type', 5),
            'browsers' => $this->reports->breakdown($query, 'browser', 8),
            'operating_systems' => $this->reports->breakdown($query, 'os', 8),
            'countries' => $this->reports->breakdown($query, 'country', 10),
            'cities' => $this->reports->breakdown($query, 'city', 10),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function pages(AnalyticsQuery $query): array
    {
        return $this->remember('pages', $query, fn () => [
            'range' => $this->rangeMeta($query),
            'pages' => array_map(fn (array $row) => $row + [
                'exit_rate' => $this->rate($row['exits'], $row['views']),
            ], $this->reports->topPages($query, 25)),
            'exit_pages' => $this->reports->exitPages($query, 10),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function properties(AnalyticsQuery $query): array
    {
        return $this->remember('properties', $query, function () use ($query) {
            $rows = $this->reports->topProperties($query, 25);
            $ids = array_column($rows, 'property_id');
            $titles = $this->properties->titlesByIds($ids);
            $leads = $this->leads->countByPropertyIdsBetween($ids, $query->from, $query->to);

            return [
                'range' => $this->rangeMeta($query),
                'properties' => array_map(function (array $row) use ($titles, $leads) {
                    $leadCount = $leads[$row['property_id']] ?? 0;

                    return $row + [
                        'title' => $titles[$row['property_id']] ?? null,
                        'leads' => $leadCount,
                        'conversion_rate' => $this->rate($leadCount, $row['visitors']),
                    ];
                }, $rows),
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function forms(AnalyticsQuery $query): array
    {
        $cutoff = CarbonImmutable::now()->subMinutes((int) config('analytics.form_abandon_after_minutes'));

        return $this->remember('forms', $query, fn () => [
            'range' => $this->rangeMeta($query),
            'forms' => array_map(fn (array $row) => $row + [
                'conversion_rate' => $this->rate($row['submitted'], $row['started']),
                'abandonment_rate' => $this->rate($row['abandoned'], $row['started']),
            ], $this->reports->forms($query, $cutoff)),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function events(AnalyticsQuery $query): array
    {
        return $this->remember('events', $query, fn () => [
            'range' => $this->rangeMeta($query),
            'events' => $this->reports->eventCounts($query),
        ]);
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    public function journeys(AnalyticsQuery $query, int $perPage, int $page): array
    {
        return $this->remember('journeys', $query, function () use ($query, $perPage, $page) {
            $paginator = $this->reports->journeys($query, $perPage, $page);
            $items = collect($paginator->items())->all();

            $propertyIds = collect($items)
                ->flatMap(fn (array $journey) => array_column($journey['steps'], 'property_id'))
                ->filter()
                ->unique()
                ->values()
                ->all();
            $titles = $this->properties->titlesByIds($propertyIds);

            $items = array_map(function (array $journey) use ($titles) {
                $journey['steps'] = array_map(fn (array $step) => $step + [
                    'property_title' => $step['property_id'] !== null ? ($titles[$step['property_id']] ?? null) : null,
                ], $journey['steps']);

                return $journey;
            }, $items);

            return [
                'items' => $items,
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ];
        }, ['per_page' => $perPage, 'page' => $page]);
    }

    /**
     * @return array<string, mixed>
     */
    public function realtime(): array
    {
        // A few seconds of caching absorbs several Admins polling at once.
        return $this->cache->remember('analytics:realtime', 10, function () {
            $window = (int) config('analytics.online_window_seconds');

            return [
                'window_seconds' => $window,
                ...$this->reports->online(CarbonImmutable::now()->subSeconds($window), 20),
            ];
        });
    }

    /**
     * @return array{visitors_today: int, visitors_week: int, visitors_month: int}
     */
    private function visitorCards(string $timezone): array
    {
        $now = CarbonImmutable::now($timezone);

        return [
            'visitors_today' => $this->reports->uniqueVisitorsBetween($now->startOfDay()->utc(), $now->utc()),
            'visitors_week' => $this->reports->uniqueVisitorsBetween($now->startOfWeek(CarbonImmutable::MONDAY)->utc(), $now->utc()),
            'visitors_month' => $this->reports->uniqueVisitorsBetween($now->startOfMonth()->utc(), $now->utc()),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function leadsByLocalDay(AnalyticsQuery $query): array
    {
        $days = [];

        foreach ($this->leads->hourlyCountsBetween($query->from, $query->to) as $hour => $count) {
            $day = CarbonImmutable::createFromFormat('Y-m-d H', $hour, 'UTC')
                ->setTimezone($query->timezone)
                ->format('Y-m-d');
            $days[$day] = ($days[$day] ?? 0) + $count;
        }

        return $days;
    }

    /**
     * @return array{from: string, to: string, timezone: string}
     */
    private function rangeMeta(AnalyticsQuery $query): array
    {
        return [
            'from' => $query->from->toIso8601String(),
            'to' => $query->to->toIso8601String(),
            'timezone' => $query->timezone,
        ];
    }

    private function rate(int $part, int $total): float
    {
        return $total > 0 ? round(($part / $total) * 100, 1) : 0.0;
    }

    /**
     * @template T
     *
     * @param  Closure(): T  $callback
     * @param  array<string, mixed>  $extra
     * @return T
     */
    private function remember(string $report, AnalyticsQuery $query, Closure $callback, array $extra = []): mixed
    {
        $ttl = $query->isLive()
            ? (int) config('analytics.cache_ttl_live_seconds')
            : (int) config('analytics.cache_ttl_closed_seconds');

        return $this->cache->remember($query->cacheKey($report, $extra), $ttl, $callback);
    }
}
