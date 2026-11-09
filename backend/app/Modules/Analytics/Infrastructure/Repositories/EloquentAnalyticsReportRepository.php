<?php

namespace App\Modules\Analytics\Infrastructure\Repositories;

use App\Modules\Analytics\Domain\Contracts\AnalyticsReportRepositoryInterface;
use App\Modules\Analytics\Domain\Data\AnalyticsQuery;
use App\Modules\Analytics\Domain\Enums\AnalyticsEventType;
use App\Modules\Analytics\Domain\Enums\PageType;
use App\Modules\Analytics\Domain\Models\AnalyticsEvent;
use App\Modules\Analytics\Domain\Models\AnalyticsFormSession;
use App\Modules\Analytics\Domain\Models\AnalyticsPageView;
use App\Modules\Analytics\Domain\Models\AnalyticsSession;
use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use InvalidArgumentException;

class EloquentAnalyticsReportRepository implements AnalyticsReportRepositoryInterface
{
    private const BREAKDOWN_COLUMNS = ['device_type', 'browser', 'os', 'country', 'city'];

    private const CLICK_EVENTS = ['cta_click', 'whatsapp_click', 'phone_click', 'email_click'];

    private const CONTACT_CLICK_EVENTS = ['whatsapp_click', 'phone_click', 'email_click'];

    private const MAX_STEPS_PER_JOURNEY = 60;

    public function totals(AnalyticsQuery $query): array
    {
        $row = $this->sessions($query)->toBase()->selectRaw(
            'count(*) as sessions,
             count(distinct visitor_id) as visitors,
             coalesce(avg(duration_seconds), 0) as avg_duration,
             coalesce(sum(case when page_views_count <= 1 then 1 else 0 end), 0) as bounces,
             coalesce(sum(case when converted_at is not null then 1 else 0 end), 0) as converted'
        )->first();

        $sessions = (int) $row->sessions;

        $pageViews = $this->restrictToSessions(
            AnalyticsPageView::query()->whereBetween('viewed_at', [$query->from, $query->to]),
            $query,
        )->count();

        $submissions = $this->restrictToSessions(
            AnalyticsFormSession::query()
                ->whereBetween('submitted_at', [$query->from, $query->to])
                ->when($query->formType, fn (Builder $builder, string $form) => $builder->where('form_type', $form)),
            $query,
        )->count();

        return [
            'sessions' => $sessions,
            'visitors' => (int) $row->visitors,
            'page_views' => $pageViews,
            'avg_session_seconds' => (int) round((float) $row->avg_duration),
            'bounce_rate' => $sessions > 0 ? round(((int) $row->bounces / $sessions) * 100, 1) : 0.0,
            'converted_sessions' => (int) $row->converted,
            'form_submissions' => $submissions,
        ];
    }

    public function uniqueVisitorsBetween(CarbonImmutable $from, CarbonImmutable $to): int
    {
        return (int) AnalyticsSession::query()
            ->whereBetween('started_at', [$from, $to])
            ->toBase()
            ->selectRaw('count(distinct visitor_id) as visitors')
            ->value('visitors');
    }

    public function dailySeries(AnalyticsQuery $query): array
    {
        $sessions = $this->localDayAggregate($this->sessions($query), 'started_at', 'count(*)', $query);
        // Summed per offset segment: a visitor active on both sides of a
        // Ramadan clock change on that one day is counted twice. Accepted,
        // since it affects at most two days a year.
        $visitors = $this->localDayAggregate($this->sessions($query), 'started_at', 'count(distinct visitor_id)', $query);
        $pageViews = $this->localDayAggregate(
            $this->restrictToSessions(AnalyticsPageView::query(), $query),
            'viewed_at',
            'count(*)',
            $query,
        );

        $series = [];
        foreach ($this->localDays($query) as $day) {
            $series[$day] = [
                'visitors' => $visitors[$day] ?? 0,
                'sessions' => $sessions[$day] ?? 0,
                'page_views' => $pageViews[$day] ?? 0,
            ];
        }

        return $series;
    }

    public function sources(AnalyticsQuery $query): array
    {
        return $this->sessions($query)->toBase()
            ->selectRaw('source, count(*) as sessions, count(distinct visitor_id) as visitors, sum(case when converted_at is not null then 1 else 0 end) as conversions')
            ->groupBy('source')
            ->orderByDesc('sessions')
            ->get()
            ->map(fn (object $row) => [
                'source' => (string) $row->source,
                'sessions' => (int) $row->sessions,
                'visitors' => (int) $row->visitors,
                'conversions' => (int) $row->conversions,
            ])
            ->all();
    }

    public function referrers(AnalyticsQuery $query, int $limit): array
    {
        return $this->sessions($query)->toBase()
            ->whereNotNull('referrer_host')
            ->selectRaw('referrer_host, count(*) as sessions')
            ->groupBy('referrer_host')
            ->orderByDesc('sessions')
            ->limit($limit)
            ->get()
            ->map(fn (object $row) => ['host' => (string) $row->referrer_host, 'sessions' => (int) $row->sessions])
            ->all();
    }

    public function campaigns(AnalyticsQuery $query, int $limit): array
    {
        return $this->sessions($query)->toBase()
            ->where(fn (QueryBuilder $builder) => $builder->whereNotNull('utm_source')->orWhereNotNull('utm_campaign'))
            ->selectRaw('utm_source, utm_medium, utm_campaign, count(*) as sessions, sum(case when converted_at is not null then 1 else 0 end) as conversions')
            ->groupBy('utm_source', 'utm_medium', 'utm_campaign')
            ->orderByDesc('sessions')
            ->limit($limit)
            ->get()
            ->map(fn (object $row) => [
                'utm_source' => $row->utm_source,
                'utm_medium' => $row->utm_medium,
                'utm_campaign' => $row->utm_campaign,
                'sessions' => (int) $row->sessions,
                'conversions' => (int) $row->conversions,
            ])
            ->all();
    }

    public function breakdown(AnalyticsQuery $query, string $column, int $limit): array
    {
        if (! in_array($column, self::BREAKDOWN_COLUMNS, true)) {
            throw new InvalidArgumentException("Unsupported breakdown column [{$column}].");
        }

        return $this->sessions($query)->toBase()
            ->selectRaw("{$column} as value, count(*) as sessions")
            ->groupBy($column)
            ->orderByDesc('sessions')
            ->limit($limit)
            ->get()
            ->map(fn (object $row) => ['value' => $row->value, 'sessions' => (int) $row->sessions])
            ->all();
    }

    public function topPages(AnalyticsQuery $query, int $limit): array
    {
        $pages = $this->restrictToSessions(
            AnalyticsPageView::query()->whereBetween('viewed_at', [$query->from, $query->to]),
            $query,
        )->toBase()
            ->selectRaw('path, max(page_type) as page_type, count(*) as views, count(distinct visitor_id) as visitors, avg(duration_seconds) as avg_seconds')
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit($limit)
            ->get();

        $exits = $pages->isEmpty() ? collect() : $this->sessions($query)->toBase()
            ->whereIn('exit_path', $pages->pluck('path')->all())
            ->selectRaw('exit_path, count(*) as exits')
            ->groupBy('exit_path')
            ->pluck('exits', 'exit_path');

        return $pages->map(fn (object $row) => [
            'path' => (string) $row->path,
            'page_type' => (string) $row->page_type,
            'views' => (int) $row->views,
            'visitors' => (int) $row->visitors,
            'avg_seconds' => $row->avg_seconds !== null ? (int) round((float) $row->avg_seconds) : null,
            'exits' => (int) ($exits[$row->path] ?? 0),
        ])->all();
    }

    public function exitPages(AnalyticsQuery $query, int $limit): array
    {
        $total = $this->sessions($query)->count();

        return $this->sessions($query)->toBase()
            ->whereNotNull('exit_path')
            ->selectRaw('exit_path, count(*) as exits')
            ->groupBy('exit_path')
            ->orderByDesc('exits')
            ->limit($limit)
            ->get()
            ->map(fn (object $row) => [
                'path' => (string) $row->exit_path,
                'exits' => (int) $row->exits,
                'sessions_share' => $total > 0 ? round(((int) $row->exits / $total) * 100, 1) : 0.0,
            ])
            ->all();
    }

    public function topProperties(AnalyticsQuery $query, int $limit): array
    {
        $views = $this->restrictToSessions(
            AnalyticsPageView::query()
                ->whereBetween('viewed_at', [$query->from, $query->to])
                ->whereNotNull('property_id'),
            $query,
        )->toBase()
            ->selectRaw('property_id, count(*) as views, count(distinct visitor_id) as visitors, avg(duration_seconds) as avg_seconds')
            ->groupBy('property_id')
            ->orderByDesc('views')
            ->limit($limit)
            ->get();

        if ($views->isEmpty()) {
            return [];
        }

        $ids = $views->pluck('property_id')->map(fn ($id) => (int) $id)->all();
        $contactIn = "'".implode("','", self::CONTACT_CLICK_EVENTS)."'";

        $clicks = $this->restrictToSessions(
            AnalyticsEvent::query()
                ->whereBetween('occurred_at', [$query->from, $query->to])
                ->whereIn('property_id', $ids)
                ->whereIn('event_type', self::CLICK_EVENTS),
            $query,
        )->toBase()
            ->selectRaw("property_id, count(*) as clicks, sum(case when event_type in ({$contactIn}) then 1 else 0 end) as contact_clicks")
            ->groupBy('property_id')
            ->get()
            ->keyBy('property_id');

        $forms = $this->restrictToSessions(
            AnalyticsFormSession::query()
                ->whereBetween('started_at', [$query->from, $query->to])
                ->whereIn('property_id', $ids),
            $query,
        )->toBase()
            ->selectRaw("property_id, count(*) as starts, sum(case when status = 'submitted' then 1 else 0 end) as submissions")
            ->groupBy('property_id')
            ->get()
            ->keyBy('property_id');

        return $views->map(function (object $row) use ($clicks, $forms) {
            $click = $clicks->get($row->property_id);
            $form = $forms->get($row->property_id);

            return [
                'property_id' => (int) $row->property_id,
                'views' => (int) $row->views,
                'visitors' => (int) $row->visitors,
                'avg_seconds' => $row->avg_seconds !== null ? (int) round((float) $row->avg_seconds) : null,
                'cta_clicks' => (int) ($click->clicks ?? 0),
                'contact_clicks' => (int) ($click->contact_clicks ?? 0),
                'form_starts' => (int) ($form->starts ?? 0),
                'form_submissions' => (int) ($form->submissions ?? 0),
            ];
        })->all();
    }

    public function forms(AnalyticsQuery $query, CarbonImmutable $abandonCutoff): array
    {
        $abandonedSql = "(status = 'abandoned' or (status = 'started' and last_interaction_at < ?))";

        $base = fn () => $this->restrictToSessions(
            AnalyticsFormSession::query()
                ->whereBetween('started_at', [$query->from, $query->to])
                ->when($query->formType, fn (Builder $builder, string $form) => $builder->where('form_type', $form)),
            $query,
        );

        $rows = $base()->toBase()
            ->selectRaw(
                "form_type,
                 count(*) as started,
                 sum(case when status = 'submitted' then 1 else 0 end) as submitted,
                 sum(case when {$abandonedSql} then 1 else 0 end) as abandoned,
                 avg(case when status = 'submitted' then timestampdiff(second, started_at, submitted_at) end) as avg_seconds_to_submit",
                [$abandonCutoff],
            )
            ->groupBy('form_type')
            ->orderByDesc('started')
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        // Where people stop: the last field touched before abandoning.
        $dropOff = $base()->toBase()
            ->whereRaw($abandonedSql, [$abandonCutoff])
            ->whereNotNull('last_field')
            ->selectRaw('form_type, last_field, count(*) as total')
            ->groupBy('form_type', 'last_field')
            ->orderByDesc('total')
            ->get()
            ->groupBy('form_type');

        $fields = $this->restrictToSessions(
            AnalyticsEvent::query()
                ->whereBetween('occurred_at', [$query->from, $query->to])
                ->where('event_type', AnalyticsEventType::FormFieldInteraction->value)
                ->whereNotNull('field')
                ->when($query->formType, fn (Builder $builder, string $form) => $builder->where('form_type', $form)),
            $query,
        )->toBase()
            ->selectRaw('form_type, field, count(*) as total')
            ->groupBy('form_type', 'field')
            ->orderByDesc('total')
            ->get()
            ->groupBy('form_type');

        return $rows->map(function (object $row) use ($dropOff, $fields) {
            $started = (int) $row->started;
            $submitted = (int) $row->submitted;
            $abandoned = (int) $row->abandoned;

            return [
                'form_type' => (string) $row->form_type,
                'started' => $started,
                'submitted' => $submitted,
                'abandoned' => $abandoned,
                'in_progress' => max(0, $started - $submitted - $abandoned),
                'avg_seconds_to_submit' => $row->avg_seconds_to_submit !== null ? (int) round((float) $row->avg_seconds_to_submit) : null,
                'drop_off_fields' => collect($dropOff->get($row->form_type, []))
                    ->take(5)
                    ->map(fn (object $field) => ['field' => (string) $field->last_field, 'count' => (int) $field->total])
                    ->values()
                    ->all(),
                'fields' => collect($fields->get($row->form_type, []))
                    ->take(10)
                    ->map(fn (object $field) => ['field' => (string) $field->field, 'interactions' => (int) $field->total])
                    ->values()
                    ->all(),
            ];
        })->all();
    }

    public function funnel(AnalyticsQuery $query): array
    {
        // Every stage counts within the same scoped sessions, so no stage
        // can exceed "sessions". Stages are not strictly nested: a visitor
        // can send the contact form without ever opening a property.
        // Correlated EXISTS lookups use the (session_id, ...) indexes.
        return [
            'sessions' => $this->sessions($query)->count(),
            'property_viewers' => $this->sessions($query)->whereExists(fn (QueryBuilder $sub) => $sub
                ->from('analytics_page_views')
                ->whereColumn('analytics_page_views.session_id', 'analytics_sessions.id')
                ->where('analytics_page_views.page_type', PageType::Property->value))
                ->count(),
            'form_starters' => $this->sessions($query)->whereExists(fn (QueryBuilder $sub) => $sub
                ->from('analytics_form_sessions')
                ->whereColumn('analytics_form_sessions.session_id', 'analytics_sessions.id'))
                ->count(),
            'converters' => $this->sessions($query)->whereNotNull('converted_at')->count(),
        ];
    }

    public function eventCounts(AnalyticsQuery $query): array
    {
        $pageViews = $this->restrictToSessions(
            AnalyticsPageView::query()->whereBetween('viewed_at', [$query->from, $query->to]),
            $query,
        )->toBase()
            ->selectRaw("count(*) as views, count(distinct session_id) as sessions,
                         sum(case when page_type = 'property' then 1 else 0 end) as property_views,
                         count(distinct case when page_type = 'property' then session_id end) as property_sessions")
            ->first();

        $events = $this->restrictToSessions(
            AnalyticsEvent::query()->whereBetween('occurred_at', [$query->from, $query->to]),
            $query,
        )->toBase()
            ->selectRaw('event_type, count(*) as total, count(distinct session_id) as sessions')
            ->groupBy('event_type')
            ->orderByDesc('total')
            ->get()
            ->map(fn (object $row) => [
                'event_type' => (string) $row->event_type,
                'count' => (int) $row->total,
                'sessions' => (int) $row->sessions,
            ])
            ->all();

        return [
            ['event_type' => 'page_view', 'count' => (int) $pageViews->views, 'sessions' => (int) $pageViews->sessions],
            ['event_type' => 'property_view', 'count' => (int) $pageViews->property_views, 'sessions' => (int) $pageViews->property_sessions],
            ...$events,
        ];
    }

    public function journeys(AnalyticsQuery $query, int $perPage, int $page): LengthAwarePaginator
    {
        $paginator = $this->sessions($query)
            ->with('visitor:id,uuid,sessions_count')
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);

        $ids = collect($paginator->items())->pluck('id')->all();
        $steps = $this->stepsForSessions($ids);

        return $paginator->through(fn (AnalyticsSession $session) => [
            'id' => $session->uuid,
            'visitor_label' => $this->visitorLabel($session->visitor?->uuid ?? $session->uuid),
            'returning' => ($session->visitor?->sessions_count ?? 1) > 1,
            'started_at' => $session->started_at->toIso8601String(),
            'last_activity_at' => $session->last_activity_at->toIso8601String(),
            'duration_seconds' => $session->duration_seconds,
            'page_views' => $session->page_views_count,
            'source' => $session->source->value,
            'referrer_host' => $session->referrer_host,
            'utm_campaign' => $session->utm_campaign,
            'device_type' => $session->device_type->value,
            'browser' => $session->browser,
            'os' => $session->os,
            'country' => $session->country,
            'city' => $session->city,
            'converted' => $session->converted_at !== null,
            'steps' => $steps[$session->id] ?? [],
        ]);
    }

    public function online(CarbonImmutable $since, int $limit): array
    {
        $base = AnalyticsSession::query()->where('last_activity_at', '>=', $since);

        $counts = (clone $base)->toBase()
            ->selectRaw('count(*) as sessions, count(distinct visitor_id) as visitors')
            ->first();

        $now = CarbonImmutable::now();

        $items = (clone $base)
            ->orderByDesc('last_activity_at')
            ->limit($limit)
            ->get(['id', 'visitor_id', 'uuid', 'exit_path', 'device_type', 'browser', 'os', 'country', 'city', 'source', 'page_views_count', 'started_at', 'last_activity_at'])
            ->map(fn (AnalyticsSession $session) => [
                'id' => $session->uuid,
                'current_path' => $session->exit_path,
                'device_type' => $session->device_type->value,
                'browser' => $session->browser,
                'os' => $session->os,
                'country' => $session->country,
                'city' => $session->city,
                'source' => $session->source->value,
                'page_views' => $session->page_views_count,
                'started_at' => $session->started_at->toIso8601String(),
                'last_activity_at' => $session->last_activity_at->toIso8601String(),
                'seconds_since_activity' => max(0, (int) $session->last_activity_at->diffInSeconds($now, true)),
            ])
            ->all();

        return [
            'sessions' => (int) $counts->sessions,
            'visitors' => (int) $counts->visitors,
            'items' => $items,
        ];
    }

    /**
     * Sessions started in the window, narrowed by every active filter.
     */
    private function sessions(AnalyticsQuery $query): Builder
    {
        $builder = AnalyticsSession::query()->whereBetween('analytics_sessions.started_at', [$query->from, $query->to]);

        if ($query->source !== null) {
            $builder->where('analytics_sessions.source', $query->source);
        }

        if ($query->device !== null) {
            $builder->where('analytics_sessions.device_type', $query->device);
        }

        if ($query->path !== null) {
            $builder->whereIn('analytics_sessions.id', AnalyticsPageView::query()
                ->select('session_id')
                ->where('path', $query->path)
                ->whereBetween('viewed_at', [$query->from, $query->to]));
        }

        if ($query->propertyId !== null) {
            $builder->whereIn('analytics_sessions.id', AnalyticsPageView::query()
                ->select('session_id')
                ->where('property_id', $query->propertyId)
                ->whereBetween('viewed_at', [$query->from, $query->to]));
        }

        if ($query->eventType !== null && $query->eventType !== AnalyticsEventType::PageView->value) {
            $builder->whereIn('analytics_sessions.id', $query->eventType === 'property_view'
                ? AnalyticsPageView::query()
                    ->select('session_id')
                    ->where('page_type', PageType::Property->value)
                    ->whereBetween('viewed_at', [$query->from, $query->to])
                : AnalyticsEvent::query()
                    ->select('session_id')
                    ->where('event_type', $query->eventType)
                    ->whereBetween('occurred_at', [$query->from, $query->to]));
        }

        if ($query->formType !== null) {
            $builder->whereIn('analytics_sessions.id', AnalyticsFormSession::query()
                ->select('session_id')
                ->where('form_type', $query->formType)
                ->whereBetween('started_at', [$query->from, $query->to]));
        }

        return $builder;
    }

    /**
     * Narrows a page-view/event/form-session query to the filtered
     * sessions. A no-op when no filter is active, so the unfiltered
     * dashboard only ever touches each table's own time index.
     */
    private function restrictToSessions(Builder $builder, AnalyticsQuery $query): Builder
    {
        if (! $query->hasSessionFilters()) {
            return $builder;
        }

        return $builder->whereIn('session_id', $this->sessions($query)->select('analytics_sessions.id'));
    }

    /**
     * Groups by the business-timezone calendar day. MySQL's CONVERT_TZ
     * needs the server's timezone tables loaded, so instead the window is
     * split at each UTC-offset transition (Morocco's Ramadan change) and each
     * piece is shifted by its own fixed offset.
     *
     * @return array<string, int>
     */
    private function localDayAggregate(Builder $builder, string $column, string $aggregate, AnalyticsQuery $query): array
    {
        $totals = [];

        foreach ($this->offsetSegments($query) as [$start, $end, $offset]) {
            $rows = (clone $builder)->toBase()
                ->where($column, '>=', $start)
                ->where($column, '<', $end)
                ->selectRaw('DATE(DATE_ADD('.$column.', INTERVAL '.((int) $offset).' SECOND)) as day, '.$aggregate.' as value')
                ->groupBy('day')
                ->get();

            foreach ($rows as $row) {
                $totals[(string) $row->day] = ($totals[(string) $row->day] ?? 0) + (int) $row->value;
            }
        }

        return $totals;
    }

    /**
     * @return array<int, array{0: CarbonImmutable, 1: CarbonImmutable, 2: int}>
     */
    private function offsetSegments(AnalyticsQuery $query): array
    {
        $end = $query->to->addSecond();
        $transitions = (new DateTimeZone($query->timezone))->getTransitions($query->from->getTimestamp(), $end->getTimestamp());

        if (! is_array($transitions) || $transitions === []) {
            return [[$query->from, $end, 0]];
        }

        $segments = [];
        $count = count($transitions);

        for ($i = 0; $i < $count; $i++) {
            $segmentStart = $i === 0 ? $query->from : CarbonImmutable::createFromTimestampUTC($transitions[$i]['ts']);
            $segmentEnd = $i + 1 < $count ? CarbonImmutable::createFromTimestampUTC($transitions[$i + 1]['ts']) : $end;

            if ($segmentEnd->gt($segmentStart)) {
                $segments[] = [$segmentStart, $segmentEnd, (int) $transitions[$i]['offset']];
            }
        }

        return $segments;
    }

    /**
     * @return array<int, string>
     */
    private function localDays(AnalyticsQuery $query): array
    {
        $day = $query->from->setTimezone($query->timezone)->startOfDay();
        $last = $query->to->setTimezone($query->timezone)->startOfDay();
        $days = [];

        while ($day->lte($last)) {
            $days[] = $day->format('Y-m-d');
            $day = $day->addDay();
        }

        return $days;
    }

    /**
     * Ordered page views and events per session, merged into one timeline.
     *
     * @param  array<int, int>  $sessionIds
     * @return array<int, array<int, array<string, mixed>>>
     */
    private function stepsForSessions(array $sessionIds): array
    {
        if ($sessionIds === []) {
            return [];
        }

        $steps = [];

        $pageViews = AnalyticsPageView::query()
            ->whereIn('session_id', $sessionIds)
            ->orderBy('viewed_at')
            ->orderBy('id')
            ->limit(self::MAX_STEPS_PER_JOURNEY * count($sessionIds))
            ->get(['session_id', 'path', 'page_type', 'property_id', 'viewed_at', 'duration_seconds']);

        foreach ($pageViews as $view) {
            $steps[$view->session_id][] = [
                'type' => $view->page_type === PageType::Property ? 'property_view' : 'page_view',
                'at' => $view->viewed_at->toIso8601String(),
                'path' => $view->path,
                'page_type' => $view->page_type->value,
                'property_id' => $view->property_id,
                'duration_seconds' => $view->duration_seconds,
                'form_type' => null,
                'field' => null,
                'label' => null,
                'sort' => [$view->viewed_at->getTimestamp(), 0],
            ];
        }

        $events = AnalyticsEvent::query()
            ->whereIn('session_id', $sessionIds)
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->limit(self::MAX_STEPS_PER_JOURNEY * count($sessionIds))
            ->get(['session_id', 'event_type', 'path', 'property_id', 'form_type', 'field', 'label', 'occurred_at']);

        foreach ($events as $event) {
            $steps[$event->session_id][] = [
                'type' => $event->event_type,
                'at' => $event->occurred_at->toIso8601String(),
                'path' => $event->path,
                'page_type' => null,
                'property_id' => $event->property_id,
                'duration_seconds' => null,
                'form_type' => $event->form_type,
                'field' => $event->field,
                'label' => $event->label,
                'sort' => [$event->occurred_at->getTimestamp(), 1],
            ];
        }

        foreach ($steps as $sessionId => $list) {
            usort($list, fn (array $a, array $b) => $a['sort'] <=> $b['sort']);
            $steps[$sessionId] = array_map(function (array $step) {
                unset($step['sort']);

                return $step;
            }, array_slice($list, 0, self::MAX_STEPS_PER_JOURNEY));
        }

        return $steps;
    }

    /**
     * A short, stable, non-reversible label ("#A8F2") so Admins can tell
     * visitors apart without ever seeing the tracker's raw identifier.
     */
    private function visitorLabel(string $uuid): string
    {
        return '#'.strtoupper(substr(hash('sha256', $uuid), 0, 4));
    }
}
