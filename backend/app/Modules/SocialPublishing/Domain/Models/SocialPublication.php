<?php

namespace App\Modules\SocialPublishing\Domain\Models;

use App\Modules\SocialPublishing\Domain\Enums\PublicationStatus;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use Illuminate\Database\Eloquent\Model;

/**
 * One property on one platform - unique(property_id, platform) is the
 * exactly-once guarantee. `property_id` is a bare column with no relation,
 * Property being a peer business module (PROJECT_RULES.md §3).
 */
class SocialPublication extends Model
{
    protected $fillable = [
        'property_id',
        'platform',
        'status',
        'platform_post_id',
        'platform_container_id',
        'caption',
        'published_at',
        'error_code',
        'error_message',
        'retry_count',
        'locked_at',
        'commit_started_at',
    ];

    protected function casts(): array
    {
        return [
            'platform' => SocialPlatform::class,
            'status' => PublicationStatus::class,
            'published_at' => 'datetime',
            'locked_at' => 'datetime',
            'commit_started_at' => 'datetime',
            'retry_count' => 'integer',
        ];
    }
}
