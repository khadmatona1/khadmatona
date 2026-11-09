<?php

namespace App\Modules\SocialPublishing\Application\Listeners;

use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\SocialPublishing\Application\SocialPublishingService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Runs inside the request that published the property, so nothing here may
 * ever fail it: a Meta or queue problem is logged, the listing still saves.
 */
class DispatchAutomaticSocialPublishing
{
    public function __construct(private readonly SocialPublishingService $publishing) {}

    public function handle(PropertyApproved $event): void
    {
        try {
            $this->publishing->publishAutomatically($event->propertyId);
        } catch (Throwable $e) {
            Log::error('social.auto_dispatch_failed', ['property_id' => $event->propertyId, 'exception' => $e::class]);
        }
    }
}
