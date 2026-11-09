<?php

namespace App\Core\Media;

use Illuminate\Contracts\Filesystem\Factory;
use Spatie\MediaLibrary\MediaCollections\Filesystem;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\FileRemover\DefaultFileRemover;
use Spatie\MediaLibrary\Support\FileRemover\FileRemover;
use Throwable;

/**
 * DefaultFileRemover finds files to delete by listing a media directory
 * (Filesystem::allFiles()) and matching entries whose last path segment
 * equals $media->file_name. cloudinary-labs/cloudinary-laravel's
 * listContents() reports Cloudinary public_ids *without* their file
 * extension, but $media->file_name always includes it (e.g. "photo.jpg")
 * - so that comparison never matches, deletion silently does nothing, and
 * every "deleted" image actually stays in Cloudinary forever.
 *
 * This bypasses that broken list-then-match approach entirely: it computes
 * each file's exact path the same way CloudinaryUrlGenerator computes URLs
 * (via Media's own path generator, not a directory listing) and deletes
 * that one known path directly - the single-file delete path
 * (CloudinaryStorageAdapter::delete()) is not affected by the listContents()
 * bug, only the directory-scan path is.
 */
class CloudinaryFileRemover implements FileRemover
{
    private DefaultFileRemover $fallback;

    public function __construct(Filesystem $mediaFileSystem, private readonly Factory $filesystem)
    {
        $this->fallback = new DefaultFileRemover($mediaFileSystem, $filesystem);
    }

    public function removeAllFiles(Media $media): void
    {
        if ($media->disk !== 'cloudinary') {
            $this->fallback->removeAllFiles($media);

            return;
        }

        $this->removeFile($media->getPathRelativeToRoot(), $media->disk);

        foreach ($media->getMediaConversionNames() as $conversionName) {
            $this->removeFile($media->getPathRelativeToRoot($conversionName), $media->disk);
        }
    }

    public function removeResponsiveImages(Media $media, string $conversionName): void
    {
        if ($media->disk !== 'cloudinary') {
            $this->fallback->removeResponsiveImages($media, $conversionName);
        }

        // Responsive image generation isn't enabled on any model in this
        // app (Property doesn't register it) - nothing to clean up.
    }

    public function removeFile(string $path, string $disk): void
    {
        if ($disk !== 'cloudinary') {
            $this->fallback->removeFile($path, $disk);

            return;
        }

        try {
            $this->filesystem->disk($disk)->delete($path);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
