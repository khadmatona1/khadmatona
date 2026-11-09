<?php

namespace App\Modules\SocialPublishing\Http\Resources;

use App\Modules\SocialPublishing\Domain\Enums\PublicationStatus;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SocialPublication */
class SocialPublicationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'platform' => $this->platform->value,
            'status' => $this->status->value,
            'platform_post_id' => $this->platform_post_id,
            'published_at' => $this->published_at,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'retry_count' => $this->retry_count,
            'can_retry' => $this->status === PublicationStatus::Failed,
            'updated_at' => $this->updated_at,
        ];
    }
}
