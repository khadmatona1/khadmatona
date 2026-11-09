<?php

namespace App\Modules\SocialPublishing\Application;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\SocialPublishing\Application\Jobs\PublishPropertyToSocialJob;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\PublicationStatus;
use App\Modules\SocialPublishing\Domain\Enums\PublishMode;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Exceptions\SocialPublishingConflict;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Support\Carbon;

class SocialPublishingService
{
    public function __construct(
        private readonly SocialPublicationRepositoryInterface $publications,
        private readonly SocialAccountRepositoryInterface $accounts,
        private readonly PropertyDirectory $properties,
    ) {}

    /**
     * Automatic path, reached only from the PropertyApproved event - nothing
     * walks existing listings, so a deployment posts nothing. reserve() makes
     * a re-approval of an already-posted (or failed) listing a no-op; a
     * failure is only ever retried by an Admin.
     */
    public function publishAutomatically(int $propertyId): void
    {
        $listing = $this->properties->socialListing($propertyId);

        if ($listing === null || ! $this->properties->isPubliclyAvailable($propertyId)) {
            return;
        }

        $settings = $this->accounts->settings();
        $preference = $this->publications->preferenceFor($propertyId);

        if ($preference === null) {
            // Without an explicit per-listing choice, only listings created
            // after default auto mode was switched on qualify.
            $autoSince = $settings->auto_enabled_at;

            if ($settings->default_mode !== PublishMode::Auto || $autoSince === null
                || Carbon::parse($listing['created_at'])->lt($autoSince)) {
                return;
            }
        } elseif ($preference->mode !== PublishMode::Auto) {
            return;
        }

        $wanted = [
            SocialPlatform::Facebook->value => $preference->facebook ?? $settings->default_facebook,
            SocialPlatform::Instagram->value => $preference->instagram ?? $settings->default_instagram,
        ];

        foreach (SocialPlatform::cases() as $platform) {
            if (! $wanted[$platform->value] || ! $settings->isEnabled($platform) || ! $this->accounts->forPlatform($platform)?->isUsable()) {
                continue;
            }

            $publication = $this->publications->reserve($propertyId, $platform);

            if ($publication !== null) {
                PublishPropertyToSocialJob::dispatch($publication->id);
            }
        }
    }

    /**
     * "Publish Now". All-or-nothing validation, so a refused platform never
     * leaves the Admin with half of what they asked for and no explanation.
     *
     * @param  array<int, SocialPlatform>  $platforms
     */
    public function publishNow(int $propertyId, array $platforms): void
    {
        if (! $this->properties->isPubliclyAvailable($propertyId)) {
            throw new SocialPublishingConflict('property_not_public');
        }

        $settings = $this->accounts->settings();

        foreach ($platforms as $platform) {
            if (! $settings->isEnabled($platform)) {
                throw new SocialPublishingConflict('platform_disabled');
            }

            $account = $this->accounts->forPlatform($platform);

            if ($account === null) {
                throw new SocialPublishingConflict('account_not_connected');
            }

            if (! $account->isUsable()) {
                throw new SocialPublishingConflict('token_invalid');
            }
        }

        $queued = 0;

        foreach ($platforms as $platform) {
            $publication = $this->publications->reserve($propertyId, $platform)
                ?? $this->publications->findForProperty($propertyId, $platform);

            if ($publication->status === PublicationStatus::Published || $publication->status === PublicationStatus::Publishing) {
                continue;
            }

            if ($publication->status === PublicationStatus::Failed) {
                $this->publications->resetForRetry($publication);
            }

            PublishPropertyToSocialJob::dispatch($publication->id);
            $queued++;
        }

        if ($queued === 0) {
            throw new SocialPublishingConflict('already_published');
        }
    }

    public function retry(SocialPublication $publication): void
    {
        if ($publication->status !== PublicationStatus::Failed) {
            throw new SocialPublishingConflict('not_retryable');
        }

        $this->publishNow($publication->property_id, [$publication->platform]);
    }
}
