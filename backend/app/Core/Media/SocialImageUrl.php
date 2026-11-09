<?php

namespace App\Core\Media;

use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * A URL safe to hand to Meta. The regular delivery URL uses f_auto, whose
 * format depends on the requester, while Instagram accepts only JPEG with a
 * 4:5 to 1.91:1 aspect ratio and crops carousels to the first image - so
 * Cloudinary serves a fixed square sRGB JPEG here instead.
 */
class SocialImageUrl
{
    private const CLOUDINARY_TRANSFORMATION = 'c_fill,g_auto,ar_1:1,w_1080/cs_srgb,f_jpg,q_auto:good';

    public static function for(Media $media): string
    {
        return str_replace(
            '/image/upload/f_auto,q_auto/',
            '/image/upload/'.self::CLOUDINARY_TRANSFORMATION.'/',
            $media->getUrl(),
        );
    }
}
