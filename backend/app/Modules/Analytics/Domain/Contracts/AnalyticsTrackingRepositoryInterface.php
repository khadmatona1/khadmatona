<?php

namespace App\Modules\Analytics\Domain\Contracts;

use App\Modules\Analytics\Domain\Models\AnalyticsFormSession;
use App\Modules\Analytics\Domain\Models\AnalyticsPageView;
use App\Modules\Analytics\Domain\Models\AnalyticsSession;
use App\Modules\Analytics\Domain\Models\AnalyticsVisitor;
use Carbon\CarbonInterface;

/**
 * Write side of analytics: everything RecordTrackingBatchAction persists.
 * Not a single-model CRUD repository, so it doesn't extend
 * RepositoryInterface. The read side is AnalyticsReportRepositoryInterface.
 *
 * Every firstOrCreate* method is idempotent on the tracker-generated uuid
 * and safe under concurrent inserts (it relies on the uuid unique index).
 * Callers can tell a fresh row apart via $model->wasRecentlyCreated.
 */
interface AnalyticsTrackingRepositoryInterface
{
    public function touchVisitor(string $uuid, CarbonInterface $firstSeenAt, CarbonInterface $lastSeenAt): AnalyticsVisitor;

    public function incrementVisitorSessions(AnalyticsVisitor $visitor): void;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function firstOrCreateSession(string $uuid, array $attributes): AnalyticsSession;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateSession(AnalyticsSession $session, array $attributes): void;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function firstOrCreatePageView(string $uuid, array $attributes): AnalyticsPageView;

    /**
     * Raises (never lowers) the engaged duration of one page view that
     * belongs to the given session.
     */
    public function extendPageViewDuration(int $sessionId, string $pageViewUuid, int $seconds): void;

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function insertEvents(array $rows): void;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function firstOrCreateFormSession(string $uuid, array $attributes): AnalyticsFormSession;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateFormSession(AnalyticsFormSession $formSession, array $attributes): void;

    /**
     * Deletes every visitor whose last activity is older than the cutoff,
     * together with all their sessions, page views, events and form
     * sessions (cascading foreign keys), plus any older sessions of
     * visitors who are still active. Works in chunks.
     *
     * @return int Number of sessions deleted.
     */
    public function pruneOlderThan(CarbonInterface $cutoff): int;
}
