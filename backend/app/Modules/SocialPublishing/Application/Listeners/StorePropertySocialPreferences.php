<?php

namespace App\Modules\SocialPublishing\Application\Listeners;

use App\Modules\Property\Domain\Events\PropertySocialPreferencesSubmitted;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\PublishMode;

/** Synchronous on purpose: PropertyApproved fires right after and reads this. */
class StorePropertySocialPreferences
{
    public function __construct(private readonly SocialPublicationRepositoryInterface $publications) {}

    public function handle(PropertySocialPreferencesSubmitted $event): void
    {
        $this->publications->savePreference($event->propertyId, [
            'facebook' => (bool) ($event->preferences['facebook'] ?? false),
            'instagram' => (bool) ($event->preferences['instagram'] ?? false),
            'mode' => $event->preferences['mode'] ?? PublishMode::Manual->value,
        ]);
    }
}
