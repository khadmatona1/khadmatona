<?php

namespace App\Core\Media;

use Spatie\MediaLibrary\Support\UrlGenerator\DefaultUrlGenerator;

/**
 * cloudinary-labs/cloudinary-laravel's Flysystem adapter implements
 * getUrl() by calling Cloudinary's Admin API (a live HTTP round-trip) just
 * to read back the asset's own secure_url. Since Spatie's DefaultUrlGenerator
 * calls exactly that on every Media::getUrl()/getFirstMediaUrl() - i.e.
 * every image, on every property list/detail response - that would mean N
 * live Cloudinary Admin API calls per request: slow, and quick to exhaust
 * Cloudinary's (much stricter) Admin API rate limit compared to its CDN.
 *
 * Cloudinary delivery URLs are fully predictable from the cloud name and
 * public_id alone, so this builds them directly (zero network calls)
 * instead, applying f_auto/q_auto so Cloudinary still picks the best
 * format/compression per-request at the CDN edge.
 *
 * A `v=` cache-busting query param is always appended (independent of
 * media-library.version_urls) because Cloudinary's CDN (Akamai) caches
 * 404 responses at the edge and does not reliably honour the origin's
 * Cache-Control/Expires once that negative response is cached - a URL
 * requested before its conversion existed (e.g. while the queue worker
 * was misconfigured) can keep 404ing from that edge node long after the
 * asset is actually live. Since the public_id itself is static, the only
 * way to guarantee a fresh request is a URL the edge has never seen.
 */
class CloudinaryUrlGenerator extends DefaultUrlGenerator
{
    public function getUrl(): string
    {
        if ($this->getDiskName() !== 'cloudinary') {
            return parent::getUrl();
        }

        // Mirrors CloudinaryStorageAdapter::prepareResource()'s public_id
        // derivation exactly, so reads resolve the same path writes used -
        // strip the extension (Cloudinary's image public_ids are
        // extension-less; format is negotiated at delivery time).
        $publicId = preg_replace('/\.[^.\/]+$/', '', $this->getPathRelativeToRoot());

        // Percent-encode each path segment (apostrophes, spaces, etc. in the
        // original filename) so the URL is unambiguous - relying on browsers
        // to treat a raw `'` the same as `%27` leaves room for CDN edge
        // nodes to key their cache on the literal, unencoded string.
        $encodedPublicId = implode('/', array_map(rawurlencode(...), explode('/', $publicId)));

        $cloudName = config('filesystems.disks.cloudinary.cloud');

        return "https://res.cloudinary.com/{$cloudName}/image/upload/f_auto,q_auto/{$encodedPublicId}?v={$this->media->updated_at->timestamp}";
    }
}
