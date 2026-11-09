<?php

namespace App\Modules\SocialPublishing\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\PublicationStatus;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Models\SocialPropertyPreference;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EloquentSocialPublicationRepository extends BaseRepository implements SocialPublicationRepositoryInterface
{
    /**
     * A worker that died leaves the row in `publishing`. This must outlast a
     * live job (PublishPropertyToSocialJob::$timeout), or two workers could
     * run the same publication side by side.
     */
    private const STALE_LOCK_SECONDS = 180;

    protected function model(): string
    {
        return SocialPublication::class;
    }

    public function forProperty(int $propertyId): Collection
    {
        return SocialPublication::where('property_id', $propertyId)->orderBy('platform')->get();
    }

    public function findForProperty(int $propertyId, SocialPlatform $platform): ?SocialPublication
    {
        return SocialPublication::where('property_id', $propertyId)->where('platform', $platform->value)->first();
    }

    public function reserve(int $propertyId, SocialPlatform $platform): ?SocialPublication
    {
        $inserted = SocialPublication::query()->insertOrIgnore([
            'property_id' => $propertyId,
            'platform' => $platform->value,
            'status' => PublicationStatus::Pending->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $inserted === 1 ? $this->findForProperty($propertyId, $platform) : null;
    }

    public function resetForRetry(SocialPublication $publication): void
    {
        $publication->update([
            'status' => PublicationStatus::Pending,
            'error_code' => null,
            'error_message' => null,
            'commit_started_at' => null,
        ]);
    }

    public function claim(int $id): ?SocialPublication
    {
        $claimed = SocialPublication::query()
            ->whereKey($id)
            ->where(function (Builder $query) {
                $query->where('status', PublicationStatus::Pending->value)
                    ->orWhere(function (Builder $stale) {
                        // Only resumable if the post can't be live already:
                        // the final call never started, or it's Instagram,
                        // whose container reports whether it went through.
                        $stale->where('status', PublicationStatus::Publishing->value)
                            ->where('locked_at', '<', now()->subSeconds(self::STALE_LOCK_SECONDS))
                            ->where(fn (Builder $safe) => $safe
                                ->whereNull('commit_started_at')
                                ->orWhere('platform', SocialPlatform::Instagram->value));
                    });
            })
            // retry_count first: MySQL evaluates SET left to right, and this
            // must read locked_at before it's overwritten. Static SQL only.
            ->update([
                'retry_count' => DB::raw('CASE WHEN locked_at IS NULL THEN 0 ELSE retry_count + 1 END'),
                'status' => PublicationStatus::Publishing->value,
                'locked_at' => now(),
            ]);

        return $claimed === 1 ? SocialPublication::find($id) : null;
    }

    public function isLockStale(SocialPublication $publication): bool
    {
        return $publication->locked_at === null
            || $publication->locked_at->lt(now()->subSeconds(self::STALE_LOCK_SECONDS));
    }

    public function saveCaption(SocialPublication $publication, string $caption): void
    {
        $publication->update(['caption' => $caption]);
    }

    public function saveContainer(SocialPublication $publication, ?string $containerId): void
    {
        $publication->update(['platform_container_id' => $containerId]);
    }

    public function markCommitStarted(SocialPublication $publication): void
    {
        $publication->update(['commit_started_at' => now()]);
    }

    public function markPublished(SocialPublication $publication, ?string $platformPostId): void
    {
        $publication->update([
            'status' => PublicationStatus::Published,
            'platform_post_id' => $platformPostId,
            'published_at' => now(),
            'error_code' => null,
            'error_message' => null,
            'commit_started_at' => null,
        ]);
    }

    public function markWaitingRetry(SocialPublication $publication, string $errorCode, string $message): void
    {
        $publication->update([
            'status' => PublicationStatus::Pending,
            'error_code' => $errorCode,
            'error_message' => $message,
            'commit_started_at' => null,
        ]);
    }

    public function markFailed(SocialPublication $publication, string $errorCode, string $message): void
    {
        $publication->update([
            'status' => PublicationStatus::Failed,
            'error_code' => $errorCode,
            'error_message' => $message,
        ]);
    }

    public function preferenceFor(int $propertyId): ?SocialPropertyPreference
    {
        return SocialPropertyPreference::where('property_id', $propertyId)->first();
    }

    public function savePreference(int $propertyId, array $attributes): SocialPropertyPreference
    {
        return SocialPropertyPreference::updateOrCreate(['property_id' => $propertyId], $attributes);
    }
}
