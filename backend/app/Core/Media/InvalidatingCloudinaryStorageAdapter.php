<?php

namespace App\Core\Media;

use Cloudinary\Cloudinary;
use CloudinaryLabs\CloudinaryLaravel\CloudinaryStorageAdapter;
use League\Flysystem\Config;
use League\MimeTypeDetection\MimeTypeDetector;

/**
 * cloudinary-labs/cloudinary-laravel's own write()/writeStream() never pass
 * Cloudinary's `invalidate` upload option. Without it, a client that
 * requests a media conversion URL moments before the queue worker finishes
 * generating it can get a 404 cached at its nearest Akamai CDN edge - and,
 * critically, that stale 404 can outlive the file actually existing, even
 * across a changed `?v=` cache-busting query string (CloudinaryUrlGenerator's
 * own cache-busting mechanism), because some edge configurations key their
 * cache on the path alone. `invalidate: true` asks Cloudinary to actively
 * push a purge to the CDN right after upload instead of waiting for that
 * stale entry to expire on its own - the supported fix for this exact
 * failure mode, confirmed via a live report of a newly-uploaded property
 * photo 404ing for one visitor while working everywhere else.
 *
 * The parent's `$cloudinary` property is private (not protected), so it
 * can't be reused from here - this keeps its own copy of the same client
 * instance passed in by CoreMediaServiceProvider instead.
 */
class InvalidatingCloudinaryStorageAdapter extends CloudinaryStorageAdapter
{
    public function __construct(
        private readonly Cloudinary $client,
        ?MimeTypeDetector $mimeTypeDetector = null,
        ?string $prefix = null,
    ) {
        parent::__construct($client, $mimeTypeDetector, $prefix);
    }

    public function write(string $path, string $contents, Config $config): void
    {
        [$id, $type] = $this->prepareResource($path);

        $this->client->uploadApi()->upload($contents, [
            'public_id' => $id,
            'resource_type' => $type,
            'invalidate' => true,
        ]);
    }

    public function writeStream(string $path, $contents, Config $config): void
    {
        [$id, $type] = $this->prepareResource($path);

        $this->client->uploadApi()->upload($contents, [
            'public_id' => $id,
            'resource_type' => $type,
            'invalidate' => true,
        ]);
    }
}
