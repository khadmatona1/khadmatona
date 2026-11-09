<?php

namespace App\Modules\SocialPublishing\Application;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\SocialPublishing\Application\Publishers\FacebookPublisher;
use App\Modules\SocialPublishing\Application\Publishers\InstagramPublisher;
use App\Modules\SocialPublishing\Application\Publishers\PlatformPublisher;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\FailureKind;
use App\Modules\SocialPublishing\Domain\Enums\PublicationStatus;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Exceptions\PublishFailure;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * One attempt at one publication - what PublishPropertyToSocialJob runs.
 * Decides the outcome of each failure kind; the job only owns queue mechanics.
 */
class PublicationRunner
{
    /** How long a job waits before re-checking a row another worker has locked. */
    private const LOCKED_RECHECK_SECONDS = 200;

    public function __construct(
        private readonly SocialPublicationRepositoryInterface $publications,
        private readonly SocialAccountRepositoryInterface $accounts,
        private readonly PropertyDirectory $properties,
        private readonly CaptionBuilder $captions,
        private readonly SocialImageInspector $images,
        private readonly FacebookPublisher $facebook,
        private readonly InstagramPublisher $instagram,
    ) {}

    /**
     * @return int|null Seconds until the job should run again, null when done
     *
     * @throws PublishFailure When retryable: the job's backoff takes over
     */
    public function run(int $publicationId): ?int
    {
        $publication = $this->publications->claim($publicationId);

        if ($publication === null) {
            return $this->handleUnclaimable($publicationId);
        }

        try {
            $postId = $this->publish($publication);
            $this->publications->markPublished($publication, $postId);

            Log::info('social.published', [
                'publication_id' => $publication->id,
                'property_id' => $publication->property_id,
                'platform' => $publication->platform->value,
            ]);

            return null;
        } catch (PublishFailure $failure) {
            return $this->handleFailure($publication, $failure);
        } catch (Throwable $e) {
            Log::error('social.unexpected_error', ['publication_id' => $publication->id, 'exception' => $e::class]);
            $this->publications->markWaitingRetry($publication, 'unexpected_error', __('social.errors.unexpected_error'));

            throw $e;
        }
    }

    /** The job has run out of attempts. */
    public function giveUp(int $publicationId): void
    {
        /** @var SocialPublication|null $publication */
        $publication = $this->publications->find($publicationId);

        if ($publication === null || $publication->status === PublicationStatus::Published || $publication->status === PublicationStatus::Failed) {
            return;
        }

        $this->publications->markFailed(
            $publication,
            $publication->error_code ?? 'unexpected_error',
            $publication->error_message ?? __('social.errors.unexpected_error'),
        );
    }

    private function publish(SocialPublication $publication): ?string
    {
        $platform = $publication->platform;
        $account = $this->accounts->forPlatform($platform);

        if ($account === null) {
            throw PublishFailure::permanent('account_not_connected');
        }

        if (! $account->isUsable()) {
            throw PublishFailure::tokenInvalid();
        }

        if (! $this->properties->isPubliclyAvailable($publication->property_id)) {
            throw PublishFailure::permanent('property_not_public');
        }

        $listing = $this->properties->socialListing($publication->property_id);

        if ($listing === null) {
            throw PublishFailure::permanent('property_not_public');
        }

        $settings = $this->accounts->settings();
        $caption = $this->captions->build($listing, $settings->caption_template);
        $this->publications->saveCaption($publication, $caption);

        $images = $this->images->usable(
            array_slice($listing['image_urls'], 0, $settings->maxImages($platform)),
            $platform,
        );

        // A listing with no photos is a valid Facebook text post, but one
        // that HAD photos, all rejected, would silently lose them.
        if ($images === [] && ($listing['image_urls'] !== [] || $platform === SocialPlatform::Instagram)) {
            throw PublishFailure::permanent($listing['image_urls'] === [] ? 'no_images' : 'no_valid_images');
        }

        return $this->publisher($platform)->publish($publication, $account, $caption, $images, $listing['url']);
    }

    private function publisher(SocialPlatform $platform): PlatformPublisher
    {
        return $platform === SocialPlatform::Facebook ? $this->facebook : $this->instagram;
    }

    private function handleFailure(SocialPublication $publication, PublishFailure $failure): ?int
    {
        Log::warning('social.publish_failed', [
            'publication_id' => $publication->id,
            'platform' => $publication->platform->value,
            'kind' => $failure->kind->value,
            'error_code' => $failure->errorCode,
        ]);

        if ($failure->kind === FailureKind::Retryable) {
            $this->publications->markWaitingRetry($publication, $failure->errorCode, $failure->getMessage());

            if ($failure->retryAfterSeconds !== null) {
                return $failure->retryAfterSeconds;
            }

            throw $failure;
        }

        if ($failure->kind === FailureKind::TokenInvalid) {
            // One Page token serves both platforms.
            $this->accounts->markAllNeedReconnect();
        }

        $this->publications->markFailed($publication, $failure->errorCode, $failure->getMessage());

        return null;
    }

    /** Finished or held by a live worker - or left behind by a dead one. */
    private function handleUnclaimable(int $publicationId): ?int
    {
        /** @var SocialPublication|null $publication */
        $publication = $this->publications->find($publicationId);

        if ($publication === null || $publication->status !== PublicationStatus::Publishing) {
            return null;
        }

        if (! $this->publications->isLockStale($publication)) {
            return self::LOCKED_RECHECK_SECONDS;
        }

        // Stale but unclaimable: a Facebook worker died during the final
        // call, so nobody knows whether the post went out.
        $failure = PublishFailure::outcomeUnknown();
        $this->publications->markFailed($publication, $failure->errorCode, $failure->getMessage());

        return null;
    }
}
