<?php

namespace App\Modules\Analytics\Infrastructure\Repositories;

use App\Modules\Analytics\Domain\Contracts\AnalyticsTrackingRepositoryInterface;
use App\Modules\Analytics\Domain\Models\AnalyticsEvent;
use App\Modules\Analytics\Domain\Models\AnalyticsFormSession;
use App\Modules\Analytics\Domain\Models\AnalyticsPageView;
use App\Modules\Analytics\Domain\Models\AnalyticsSession;
use App\Modules\Analytics\Domain\Models\AnalyticsVisitor;
use Carbon\CarbonInterface;

class EloquentAnalyticsTrackingRepository implements AnalyticsTrackingRepositoryInterface
{
    private const PRUNE_CHUNK = 1000;

    public function touchVisitor(string $uuid, CarbonInterface $firstSeenAt, CarbonInterface $lastSeenAt): AnalyticsVisitor
    {
        /** @var AnalyticsVisitor $visitor */
        $visitor = AnalyticsVisitor::query()->firstOrCreate(
            ['uuid' => $uuid],
            ['first_seen_at' => $firstSeenAt, 'last_seen_at' => $lastSeenAt, 'sessions_count' => 0],
        );

        if (! $visitor->wasRecentlyCreated && $visitor->last_seen_at->lt($lastSeenAt)) {
            $visitor->forceFill(['last_seen_at' => $lastSeenAt])->save();
        }

        return $visitor;
    }

    public function incrementVisitorSessions(AnalyticsVisitor $visitor): void
    {
        $visitor->increment('sessions_count');
    }

    public function firstOrCreateSession(string $uuid, array $attributes): AnalyticsSession
    {
        /** @var AnalyticsSession */
        return AnalyticsSession::query()->firstOrCreate(['uuid' => $uuid], $attributes);
    }

    public function updateSession(AnalyticsSession $session, array $attributes): void
    {
        $session->forceFill($attributes)->save();
    }

    public function firstOrCreatePageView(string $uuid, array $attributes): AnalyticsPageView
    {
        /** @var AnalyticsPageView */
        return AnalyticsPageView::query()->firstOrCreate(['uuid' => $uuid], $attributes);
    }

    public function extendPageViewDuration(int $sessionId, string $pageViewUuid, int $seconds): void
    {
        AnalyticsPageView::query()
            ->where('uuid', $pageViewUuid)
            ->where('session_id', $sessionId)
            ->where(fn ($query) => $query->whereNull('duration_seconds')->orWhere('duration_seconds', '<', $seconds))
            ->update(['duration_seconds' => $seconds, 'updated_at' => now()]);
    }

    public function insertEvents(array $rows): void
    {
        if ($rows === []) {
            return;
        }

        $now = now();
        AnalyticsEvent::query()->insert(array_map(fn (array $row) => $row + ['created_at' => $now], $rows));
    }

    public function firstOrCreateFormSession(string $uuid, array $attributes): AnalyticsFormSession
    {
        /** @var AnalyticsFormSession */
        return AnalyticsFormSession::query()->firstOrCreate(['uuid' => $uuid], $attributes);
    }

    public function updateFormSession(AnalyticsFormSession $formSession, array $attributes): void
    {
        $formSession->forceFill($attributes)->save();
    }

    public function pruneOlderThan(CarbonInterface $cutoff): int
    {
        $deleted = 0;

        // Sessions first (their page views, events and form sessions go with
        // them through ON DELETE CASCADE), in bounded chunks so a large
        // backlog never becomes one long-running lock.
        do {
            $ids = AnalyticsSession::query()
                ->where('last_activity_at', '<', $cutoff)
                ->limit(self::PRUNE_CHUNK)
                ->pluck('id');

            if ($ids->isNotEmpty()) {
                $deleted += AnalyticsSession::query()->whereIn('id', $ids)->delete();
            }
        } while ($ids->count() === self::PRUNE_CHUNK);

        do {
            $ids = AnalyticsVisitor::query()
                ->where('last_seen_at', '<', $cutoff)
                ->limit(self::PRUNE_CHUNK)
                ->pluck('id');

            if ($ids->isNotEmpty()) {
                AnalyticsVisitor::query()->whereIn('id', $ids)->delete();
            }
        } while ($ids->count() === self::PRUNE_CHUNK);

        return $deleted;
    }
}
