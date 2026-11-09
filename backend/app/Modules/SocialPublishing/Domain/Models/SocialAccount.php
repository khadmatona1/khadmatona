<?php

namespace App\Modules\SocialPublishing\Domain\Models;

use App\Modules\SocialPublishing\Domain\Enums\SocialAccountStatus;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use Illuminate\Database\Eloquent\Model;

/**
 * The connected Facebook Page / Instagram professional account - one row per
 * platform. The token is encrypted at rest with APP_KEY and never serialized.
 */
class SocialAccount extends Model
{
    protected $fillable = [
        'platform',
        'external_id',
        'name',
        'access_token',
        'status',
        'connected_by',
    ];

    protected $hidden = ['access_token'];

    protected function casts(): array
    {
        return [
            'platform' => SocialPlatform::class,
            'status' => SocialAccountStatus::class,
            'access_token' => 'encrypted',
        ];
    }

    public function isUsable(): bool
    {
        return $this->status === SocialAccountStatus::Connected;
    }
}
