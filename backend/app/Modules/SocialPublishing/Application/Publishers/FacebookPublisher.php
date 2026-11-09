<?php

namespace App\Modules\SocialPublishing\Application\Publishers;

use App\Modules\SocialPublishing\Domain\Contracts\MetaGraphClient;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;

/**
 * Photos go up unpublished, then a single /feed POST makes the post public -
 * the same shape for one photo or ten, leaving exactly one call that can
 * create a post. Orphaned uploads from a failed attempt are harmless: Meta
 * deletes unpublished photos after about 24 hours.
 */
class FacebookPublisher implements PlatformPublisher
{
    public function __construct(
        private readonly MetaGraphClient $meta,
        private readonly SocialPublicationRepositoryInterface $publications,
    ) {}

    public function publish(SocialPublication $publication, SocialAccount $account, string $caption, array $imageUrls, string $listingUrl): ?string
    {
        $photoIds = array_map(
            fn (string $url) => $this->meta->uploadUnpublishedPhoto($account->external_id, $account->access_token, $url),
            $imageUrls,
        );

        $this->publications->markCommitStarted($publication);

        return $this->meta->publishFeedPost($account->external_id, $account->access_token, $caption, $photoIds, $listingUrl);
    }
}
