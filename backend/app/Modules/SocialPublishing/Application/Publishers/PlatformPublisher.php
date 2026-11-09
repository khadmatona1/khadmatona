<?php

namespace App\Modules\SocialPublishing\Application\Publishers;

use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;

interface PlatformPublisher
{
    /**
     * @param  array<int, string>  $imageUrls  Validated, possibly empty
     * @return string|null The platform's post id - null only when the post is
     *                     confirmed live but Meta can't return its id anymore
     */
    public function publish(SocialPublication $publication, SocialAccount $account, string $caption, array $imageUrls, string $listingUrl): ?string;
}
