<?php

namespace App\Modules\SocialPublishing\Application;

use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Exceptions\PublishFailure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta downloads images itself, so an image it can't reach or won't accept
 * only shows up as an opaque error mid-publish. Checking first gives the
 * Admin a clear reason, and lets one bad photo drop out instead of failing
 * the whole post. Width and aspect ratio aren't checked: that would mean
 * downloading each file, and the Cloudinary derivative guarantees both.
 */
class SocialImageInspector
{
    private const MAX_BYTES = [
        SocialPlatform::Facebook->value => 4 * 1024 * 1024,
        SocialPlatform::Instagram->value => 8 * 1024 * 1024,
    ];

    /**
     * @param  array<int, string>  $urls
     * @return array<int, string> The usable subset, in order
     */
    public function usable(array $urls, SocialPlatform $platform): array
    {
        return array_values(array_filter($urls, fn (string $url) => $this->isUsable($url, $platform)));
    }

    private function isUsable(string $url, SocialPlatform $platform): bool
    {
        if (! $this->isPublicHttps($url)) {
            return $this->reject('not_public', $platform);
        }

        try {
            $response = Http::timeout(10)->head($url);
        } catch (ConnectionException) {
            throw PublishFailure::retryable('image_unreachable');
        }

        if ($response->serverError()) {
            throw PublishFailure::retryable('image_unreachable');
        }

        if (! $response->successful()) {
            return $this->reject('http_'.$response->status(), $platform);
        }

        $type = strtolower(trim(explode(';', $response->header('Content-Type'))[0]));

        if (! str_starts_with($type, 'image/')) {
            return $this->reject('not_an_image', $platform);
        }

        // Instagram's only accepted format.
        if ($platform === SocialPlatform::Instagram && $type !== 'image/jpeg') {
            return $this->reject('not_jpeg', $platform);
        }

        if ((int) $response->header('Content-Length') > self::MAX_BYTES[$platform->value]) {
            return $this->reject('too_large', $platform);
        }

        return true;
    }

    private function isPublicHttps(string $url): bool
    {
        $parts = parse_url($url);
        $host = strtolower((string) ($parts['host'] ?? ''));

        if (($parts['scheme'] ?? null) !== 'https' || $host === '' || $host === 'localhost' || str_ends_with($host, '.local')) {
            return false;
        }

        return filter_var($host, FILTER_VALIDATE_IP) === false
            || filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    private function reject(string $reason, SocialPlatform $platform): bool
    {
        Log::info('social.image_rejected', ['platform' => $platform->value, 'reason' => $reason]);

        return false;
    }
}
