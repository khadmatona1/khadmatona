<?php

namespace App\Modules\SocialPublishing\Domain\Models;

use App\Modules\SocialPublishing\Domain\Enums\PublishMode;
use Illuminate\Database\Eloquent\Model;

class SocialPropertyPreference extends Model
{
    protected $fillable = ['property_id', 'facebook', 'instagram', 'mode'];

    protected function casts(): array
    {
        return [
            'facebook' => 'boolean',
            'instagram' => 'boolean',
            'mode' => PublishMode::class,
        ];
    }
}
