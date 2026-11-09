<?php

namespace App\Core\Media\Concerns;

use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Sane default responsive/WebP conversions for any model that stores
 * images through the Core Media module (Property galleries today,
 * Artisan portfolios and verification documents later). A model can
 * still declare its own registerMediaConversions() to override these -
 * a class method always wins over the trait's.
 *
 * Models using this trait must also `implements HasMedia`
 * (Spatie\MediaLibrary\HasMedia).
 */
trait HasMediaConversions
{
    use InteractsWithMedia;

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 400, 400)
            ->format('webp')
            ->queued();

        $this->addMediaConversion('medium')
            ->fit(Fit::Contain, 1200, 1200)
            ->format('webp')
            ->queued();
    }
}
