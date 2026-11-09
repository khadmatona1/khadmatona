<?php

namespace App\Modules\SocialPublishing\Application\Publishers;

use App\Modules\SocialPublishing\Domain\Contracts\MetaGraphClient;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Exceptions\PublishFailure;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;

/**
 * Two-step publishing: a media container, then media_publish. The container
 * id is saved before anything else, so a retry resumes the same container -
 * and if it reports PUBLISHED, the earlier attempt succeeded and nothing is
 * sent again.
 */
class InstagramPublisher implements PlatformPublisher
{
    /** Stays well inside PublishPropertyToSocialJob::$timeout; a retry picks up from here. */
    private const STATUS_CHECKS = 4;

    private const STATUS_CHECK_INTERVAL_SECONDS = 5;

    /** Meta's window is a moving 24 hours, so usage can't drop much faster. */
    private const QUOTA_RETRY_SECONDS = 3600;

    public function __construct(
        private readonly MetaGraphClient $meta,
        private readonly SocialPublicationRepositoryInterface $publications,
    ) {}

    public function publish(SocialPublication $publication, SocialAccount $account, string $caption, array $imageUrls, string $listingUrl): ?string
    {
        $igUserId = $account->external_id;
        $token = $account->access_token;
        $containerId = $publication->platform_container_id;

        if ($containerId === null) {
            if ($imageUrls === []) {
                throw PublishFailure::permanent('no_valid_images');
            }

            $this->ensureQuota($igUserId, $token);
            $containerId = $this->createContainer($igUserId, $token, $caption, $imageUrls);
            $this->publications->saveContainer($publication, $containerId);
        }

        if ($this->waitUntilReady($publication, $containerId, $token) === 'PUBLISHED') {
            Log::info('social.instagram_already_published', ['publication_id' => $publication->id]);

            return null;
        }

        $this->ensureQuota($igUserId, $token);
        $this->publications->markCommitStarted($publication);

        return $this->meta->publishContainer($igUserId, $token, $containerId);
    }

    /** @param  array<int, string>  $imageUrls */
    private function createContainer(string $igUserId, string $token, string $caption, array $imageUrls): string
    {
        if (count($imageUrls) === 1) {
            return $this->meta->createImageContainer($igUserId, $token, $imageUrls[0], $caption, false);
        }

        $children = array_map(
            fn (string $url) => $this->meta->createImageContainer($igUserId, $token, $url, null, true),
            $imageUrls,
        );

        return $this->meta->createCarouselContainer($igUserId, $token, $children, $caption);
    }

    private function waitUntilReady(SocialPublication $publication, string $containerId, string $token): string
    {
        for ($check = 1; $check <= self::STATUS_CHECKS; $check++) {
            $status = $this->meta->containerStatus($containerId, $token);

            if ($status === 'FINISHED' || $status === 'PUBLISHED') {
                return $status;
            }

            if ($status === 'ERROR') {
                $this->publications->saveContainer($publication, null);

                throw PublishFailure::permanent('container_error');
            }

            if ($status === 'EXPIRED') {
                $this->publications->saveContainer($publication, null);

                throw PublishFailure::retryable('container_expired');
            }

            if ($check < self::STATUS_CHECKS) {
                Sleep::for(self::STATUS_CHECK_INTERVAL_SECONDS)->seconds();
            }
        }

        throw PublishFailure::retryable('container_not_ready');
    }

    private function ensureQuota(string $igUserId, string $token): void
    {
        ['usage' => $usage, 'total' => $total] = $this->meta->publishingQuota($igUserId, $token);

        if ($total !== null && $usage >= $total) {
            throw PublishFailure::retryable('instagram_quota_reached', retryAfterSeconds: self::QUOTA_RETRY_SECONDS);
        }
    }
}
