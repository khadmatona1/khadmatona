<?php

namespace App\Modules\SocialPublishing\Domain\Models;

use App\Modules\SocialPublishing\Domain\Enums\PublishMode;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use Illuminate\Database\Eloquent\Model;

/**
 * Singleton. Every default is "off" so a deployment publishes nothing until
 * an Admin deliberately opts in. `auto_enabled_at` records when default auto
 * mode was turned on: listings older than that never post on their own.
 */
class SocialSetting extends Model
{
    protected $fillable = [
        'facebook_enabled',
        'instagram_enabled',
        'default_facebook',
        'default_instagram',
        'default_mode',
        'caption_template',
        'facebook_max_images',
        'instagram_max_images',
        'auto_enabled_at',
    ];

    protected function casts(): array
    {
        return [
            'facebook_enabled' => 'boolean',
            'instagram_enabled' => 'boolean',
            'default_facebook' => 'boolean',
            'default_instagram' => 'boolean',
            'default_mode' => PublishMode::class,
            'facebook_max_images' => 'integer',
            'instagram_max_images' => 'integer',
            'auto_enabled_at' => 'datetime',
        ];
    }

    public function isEnabled(SocialPlatform $platform): bool
    {
        return $platform === SocialPlatform::Facebook ? $this->facebook_enabled : $this->instagram_enabled;
    }

    public function maxImages(SocialPlatform $platform): int
    {
        return $platform === SocialPlatform::Facebook ? $this->facebook_max_images : $this->instagram_max_images;
    }
}
