<?php

namespace App\Modules\SocialPublishing\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Models\SocialPropertyPreference;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Support\Collection;

interface SocialPublicationRepositoryInterface extends RepositoryInterface
{
    /** @return Collection<int, SocialPublication> */
    public function forProperty(int $propertyId): Collection;

    public function findForProperty(int $propertyId, SocialPlatform $platform): ?SocialPublication;

    /** Atomically creates the row; null when it already existed. */
    public function reserve(int $propertyId, SocialPlatform $platform): ?SocialPublication;

    /** Puts a failed row back in the queue for an explicit Admin retry. */
    public function resetForRetry(SocialPublication $publication): void;

    /**
     * Atomically takes the row for one worker. Null when another worker
     * holds it, it's finished, or it isn't safe to touch.
     */
    public function claim(int $id): ?SocialPublication;

    public function isLockStale(SocialPublication $publication): bool;

    public function saveCaption(SocialPublication $publication, string $caption): void;

    public function saveContainer(SocialPublication $publication, ?string $containerId): void;

    public function markCommitStarted(SocialPublication $publication): void;

    public function markPublished(SocialPublication $publication, ?string $platformPostId): void;

    public function markWaitingRetry(SocialPublication $publication, string $errorCode, string $message): void;

    public function markFailed(SocialPublication $publication, string $errorCode, string $message): void;

    public function preferenceFor(int $propertyId): ?SocialPropertyPreference;

    /** @param  array{facebook: bool, instagram: bool, mode: string}  $attributes */
    public function savePreference(int $propertyId, array $attributes): SocialPropertyPreference;
}
