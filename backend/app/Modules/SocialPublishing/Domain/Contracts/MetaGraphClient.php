<?php

namespace App\Modules\SocialPublishing\Domain\Contracts;

/**
 * Meta's Graph API, as used by this module. Every failure surfaces as a
 * classified PublishFailure.
 */
interface MetaGraphClient
{
    /** App credentials present - required to connect, not to publish. */
    public function isConfigured(): bool;

    public function authorizationUrl(string $state): string;

    /** Exchanges the OAuth code, returning a long-lived User token. */
    public function exchangeCode(string $code): string;

    /**
     * Pages the user can publish to, each with its own Page token.
     *
     * @return array<int, array{id: string, name: string, access_token: string, instagram: array{id: string, username: string}|null}>
     */
    public function listPages(string $userToken): array;

    /** Throws PublishFailure if Meta rejects the token. */
    public function verifyToken(string $token): void;

    /** @return string The unpublished photo's id */
    public function uploadUnpublishedPhoto(string $pageId, string $token, string $imageUrl): string;

    /**
     * @param  array<int, string>  $photoIds
     * @return string The Page post id
     */
    public function publishFeedPost(string $pageId, string $token, string $message, array $photoIds, ?string $link = null): string;

    /** @return string The container id */
    public function createImageContainer(string $igUserId, string $token, string $imageUrl, ?string $caption, bool $isCarouselItem): string;

    /**
     * @param  array<int, string>  $childContainerIds
     * @return string The container id
     */
    public function createCarouselContainer(string $igUserId, string $token, array $childContainerIds, string $caption): string;

    /** @return string EXPIRED, ERROR, FINISHED, IN_PROGRESS or PUBLISHED */
    public function containerStatus(string $containerId, string $token): string;

    /** @return string The published media id */
    public function publishContainer(string $igUserId, string $token, string $containerId): string;

    /** @return array{usage: int, total: int|null} */
    public function publishingQuota(string $igUserId, string $token): array;
}
