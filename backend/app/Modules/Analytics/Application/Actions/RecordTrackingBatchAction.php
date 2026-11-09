<?php

namespace App\Modules\Analytics\Application\Actions;

use App\Modules\Analytics\Domain\Contracts\AnalyticsTrackingRepositoryInterface;
use App\Modules\Analytics\Domain\Contracts\GeoResolverInterface;
use App\Modules\Analytics\Domain\Data\TrackingBatch;
use App\Modules\Analytics\Domain\Enums\AnalyticsEventType;
use App\Modules\Analytics\Domain\Enums\FormSessionStatus;
use App\Modules\Analytics\Domain\Enums\PageType;
use App\Modules\Analytics\Domain\Models\AnalyticsFormSession;
use App\Modules\Analytics\Domain\Models\AnalyticsSession;
use App\Modules\Analytics\Domain\Services\PageClassifier;
use App\Modules\Analytics\Domain\Services\TrafficSourceClassifier;
use App\Modules\Analytics\Domain\Services\UserAgentParser;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Persists one tracker batch: upserts the anonymous visitor and session,
 * records page views, stores generic events, and drives the per-form
 * started/submitted/abandoned funnel rows.
 *
 * Observes the business flow, never takes part in it: the Lead/Visit
 * modules know nothing about analytics, and analytics failing can never
 * affect a lead being created.
 */
class RecordTrackingBatchAction
{
    /** Longest engaged time credited to one page view (4 hours). */
    private const MAX_PAGE_SECONDS = 14_400;

    /** Client timestamps further in the past than this are clamped. */
    private const MAX_EVENT_AGE_SECONDS = 86_400;

    private const MAX_FIELDS_PER_FORM = 40;

    public function __construct(
        private readonly AnalyticsTrackingRepositoryInterface $tracking,
        private readonly GeoResolverInterface $geo,
        private readonly UserAgentParser $userAgents,
        private readonly TrafficSourceClassifier $traffic,
        private readonly PageClassifier $pages,
    ) {}

    public function execute(TrackingBatch $batch): void
    {
        if ($this->userAgents->isBot($batch->userAgent)) {
            return;
        }

        $events = $this->normalizeEvents($batch);
        if ($events === []) {
            return;
        }

        $firstAt = $events[0]['occurred_at'];
        $lastAt = end($events)['occurred_at'];

        DB::transaction(function () use ($batch, $events, $firstAt, $lastAt) {
            $visitor = $this->tracking->touchVisitor($batch->visitorUuid, $firstAt, $lastAt);

            $session = $this->tracking->firstOrCreateSession(
                $batch->sessionUuid,
                $this->newSessionAttributes($batch, $visitor->id, $firstAt, $events),
            );

            // A session id reused under a different visitor id is either a
            // tampered request or a client bug. Either way it must not
            // write into someone else's session.
            if ($session->visitor_id !== $visitor->id) {
                return;
            }

            if ($session->wasRecentlyCreated) {
                $this->tracking->incrementVisitorSessions($visitor);
            }

            $this->applyEvents($session, $events);
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $events
     */
    private function applyEvents(AnalyticsSession $session, array $events): void
    {
        $pageViews = 0;
        $exitPath = null;
        $exitAt = null;
        $previousActivity = $session->last_activity_at;
        $landingPath = $session->landing_path;
        $convertedAt = $session->converted_at;
        $lastActivity = $session->last_activity_at;
        $eventRows = [];

        foreach ($events as $event) {
            /** @var AnalyticsEventType $type */
            $type = $event['type'];
            /** @var CarbonImmutable $at */
            $at = $event['occurred_at'];

            if ($at->gt($lastActivity)) {
                $lastActivity = $at;
            }

            if ($type === AnalyticsEventType::PageView) {
                if ($event['path'] === null || $event['page_view_id'] === null) {
                    continue;
                }

                $pageView = $this->tracking->firstOrCreatePageView($event['page_view_id'], [
                    'session_id' => $session->id,
                    'visitor_id' => $session->visitor_id,
                    'path' => $event['path'],
                    'page_type' => $this->pages->classify($event['path']),
                    'property_id' => $this->pages->propertyId($event['path']),
                    'viewed_at' => $at,
                ]);

                if ($pageView->wasRecentlyCreated) {
                    $pageViews++;
                    $landingPath ??= $event['path'];
                    // Events are sorted, so the last one wins. It is only
                    // the exit page if it is not older than activity the
                    // session already recorded from an earlier batch.
                    if ($session->wasRecentlyCreated || $at->gte($previousActivity)) {
                        $exitPath = $event['path'];
                        $exitAt = $at;
                    }
                }

                continue;
            }

            if ($type === AnalyticsEventType::PageLeave || $type === AnalyticsEventType::Heartbeat) {
                if ($event['page_view_id'] !== null && $event['duration_seconds'] !== null) {
                    $this->tracking->extendPageViewDuration($session->id, $event['page_view_id'], $event['duration_seconds']);
                }

                continue;
            }

            if ($type->isFormLifecycle()) {
                if ($event['form_id'] === null || $event['form_type'] === null) {
                    continue;
                }

                $formSession = $this->applyFormEvent($session, $type, $event);
                if ($formSession === null) {
                    continue;
                }

                if ($type === AnalyticsEventType::FormSubmitted && $convertedAt === null) {
                    $convertedAt = $at;
                }
            }

            $eventRows[] = [
                'session_id' => $session->id,
                'visitor_id' => $session->visitor_id,
                'event_type' => $type->value,
                'path' => $event['path'],
                'property_id' => $event['property_id'],
                'form_type' => $event['form_type'],
                'field' => $event['field'],
                // A form_step event's step name ("details") is kept in the
                // generic label column, so journeys can show it.
                'label' => $type === AnalyticsEventType::FormStep ? ($event['step'] ?? $event['label']) : $event['label'],
                'occurred_at' => $at,
            ];
        }

        $this->tracking->insertEvents($eventRows);

        $attributes = [
            'last_activity_at' => $lastActivity,
            'duration_seconds' => max(0, (int) $session->started_at->diffInSeconds($lastActivity, true)),
            'page_views_count' => $session->page_views_count + $pageViews,
            'events_count' => $session->events_count + count($eventRows),
            'landing_path' => $landingPath,
            'converted_at' => $convertedAt,
        ];

        // Out-of-order delivery (a late beacon from an earlier page) must
        // not overwrite the real exit page with an older one.
        if ($exitPath !== null && $exitAt !== null) {
            $attributes['exit_path'] = $exitPath;
        }

        $this->tracking->updateSession($session, $attributes);
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function applyFormEvent(AnalyticsSession $session, AnalyticsEventType $type, array $event): ?AnalyticsFormSession
    {
        /** @var CarbonImmutable $at */
        $at = $event['occurred_at'];

        $formSession = $this->tracking->firstOrCreateFormSession($event['form_id'], [
            'session_id' => $session->id,
            'visitor_id' => $session->visitor_id,
            'form_type' => $event['form_type'],
            'property_id' => $event['property_id'],
            'status' => FormSessionStatus::Started,
            'started_at' => $at,
            'last_interaction_at' => $at,
            'fields_interacted' => [],
        ]);

        if ($formSession->session_id !== $session->id) {
            return null;
        }

        $fields = $formSession->fields_interacted ?? [];
        $attributes = [];

        if ($at->gt($formSession->last_interaction_at)) {
            $attributes['last_interaction_at'] = $at;
        }

        if ($event['field'] !== null) {
            if (! in_array($event['field'], $fields, true) && count($fields) < self::MAX_FIELDS_PER_FORM) {
                $fields[] = $event['field'];
                $attributes['fields_interacted'] = $fields;
            }
            $attributes['last_field'] = $event['field'];
        }

        if ($event['step'] !== null) {
            $attributes['last_step'] = $event['step'];
        }

        $isSubmitted = $formSession->status === FormSessionStatus::Submitted;

        switch ($type) {
            case AnalyticsEventType::FormSubmitted:
                $attributes['status'] = FormSessionStatus::Submitted;
                $attributes['submitted_at'] = $at;
                $attributes['abandoned_at'] = null;
                break;

            case AnalyticsEventType::FormAbandoned:
                if (! $isSubmitted) {
                    $attributes['status'] = FormSessionStatus::Abandoned;
                    $attributes['abandoned_at'] = $at;
                }
                break;

            default:
                // The visitor came back to a form previously reported as
                // abandoned (tab hidden, then shown again) and kept going.
                if ($formSession->status === FormSessionStatus::Abandoned) {
                    $attributes['status'] = FormSessionStatus::Started;
                    $attributes['abandoned_at'] = null;
                }
        }

        if ($attributes !== []) {
            $this->tracking->updateFormSession($formSession, $attributes);
        }

        return $formSession;
    }

    /**
     * @param  array<int, array<string, mixed>>  $events
     * @return array<string, mixed>
     */
    private function newSessionAttributes(TrackingBatch $batch, int $visitorId, CarbonImmutable $startedAt, array $events): array
    {
        $context = $batch->context;
        $classification = $this->traffic->classify(
            $context['referrer'] ?? null,
            $context['utm_source'] ?? null,
            $context['utm_medium'] ?? null,
            $this->ownHosts(),
        );
        $agent = $this->userAgents->parse($batch->userAgent);
        $geo = $this->geo->resolve($batch->countryHeader, $batch->cityHeader, $context['timezone'] ?? null);

        $firstPage = collect($events)->first(fn (array $event) => $event['type'] === AnalyticsEventType::PageView && $event['path'] !== null);
        $landing = $this->pages->normalizePath($context['landing_path'] ?? null) ?? ($firstPage['path'] ?? null);

        return [
            'visitor_id' => $visitorId,
            'started_at' => $startedAt,
            'last_activity_at' => $startedAt,
            'landing_path' => $landing,
            'exit_path' => $landing,
            'referrer_host' => $classification->referrerHost,
            'source' => $classification->source,
            'medium' => $classification->medium,
            'utm_source' => $this->clip($context['utm_source'] ?? null, 100),
            'utm_medium' => $this->clip($context['utm_medium'] ?? null, 100),
            'utm_campaign' => $this->clip($context['utm_campaign'] ?? null, 150),
            'utm_term' => $this->clip($context['utm_term'] ?? null, 150),
            'utm_content' => $this->clip($context['utm_content'] ?? null, 150),
            'device_type' => $agent->deviceType,
            'browser' => $agent->browser,
            'os' => $agent->os,
            'country' => $geo->country,
            'city' => $geo->city,
            'geo_source' => $geo->source,
            'locale' => $context['locale'] ?? null,
        ];
    }

    /**
     * Converts client timestamps to server time. The tracker sends its own
     * clock reading at send time (sent_at) plus each event's timestamp, so
     * only the relative offset is trusted. A visitor's wrong device clock
     * therefore never skews the data.
     *
     * @return array<int, array<string, mixed>>
     */
    private function normalizeEvents(TrackingBatch $batch): array
    {
        $receivedAt = CarbonImmutable::createFromTimestampMs($batch->receivedAtMs, 'UTC');
        $normalized = [];

        foreach ($batch->events as $index => $raw) {
            $type = AnalyticsEventType::tryFrom((string) ($raw['type'] ?? ''));
            if ($type === null) {
                continue;
            }

            $ageMs = max(0, $batch->sentAtMs - (int) ($raw['ts'] ?? $batch->sentAtMs));
            $ageSeconds = min(self::MAX_EVENT_AGE_SECONDS, intdiv($ageMs, 1000));
            $path = $this->pages->normalizePath($raw['path'] ?? null);

            $propertyId = isset($raw['property_id']) ? (int) $raw['property_id'] : null;
            if ($propertyId === null && $path !== null && $this->pages->classify($path) === PageType::Property) {
                $propertyId = $this->pages->propertyId($path);
            }

            $durationMs = isset($raw['duration_ms']) ? (int) $raw['duration_ms'] : null;

            $normalized[] = [
                'index' => $index,
                'type' => $type,
                'occurred_at' => $receivedAt->subSeconds($ageSeconds),
                'path' => $path,
                'page_view_id' => $raw['page_view_id'] ?? null,
                'form_id' => $raw['form_id'] ?? null,
                'form_type' => $raw['form_type'] ?? null,
                'property_id' => $propertyId,
                'field' => $raw['field'] ?? null,
                'step' => $raw['step'] ?? null,
                'label' => $raw['label'] ?? null,
                'duration_seconds' => $durationMs !== null ? min(self::MAX_PAGE_SECONDS, intdiv(max(0, $durationMs), 1000)) : null,
            ];
        }

        // Chronological, keeping the tracker's order for equal timestamps.
        usort($normalized, fn (array $a, array $b) => [$a['occurred_at'], $a['index']] <=> [$b['occurred_at'], $b['index']]);

        return $normalized;
    }

    /**
     * @return array<int, string>
     */
    private function ownHosts(): array
    {
        $hosts = array_map(
            fn (string $domain) => strtolower((string) preg_replace('/:\d+$/', '', trim($domain))),
            (array) config('sanctum.stateful', []),
        );

        foreach ([config('app.url'), config('app.frontend_url')] as $url) {
            $host = is_string($url) ? parse_url($url, PHP_URL_HOST) : null;
            if (is_string($host)) {
                $hosts[] = strtolower($host);
            }
        }

        return array_values(array_unique(array_filter($hosts)));
    }

    private function clip(?string $value, int $length): ?string
    {
        $value = $value !== null ? trim($value) : null;

        return $value === null || $value === '' ? null : mb_substr($value, 0, $length);
    }
}
