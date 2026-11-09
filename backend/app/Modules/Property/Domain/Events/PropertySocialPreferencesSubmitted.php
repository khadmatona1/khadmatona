<?php

namespace App\Modules\Property\Domain\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * An Admin chose social publishing options while creating a listing. Fired
 * before PropertyApproved, so a listener can act on the choice the moment the
 * listing goes public, without Property knowing anything about social media.
 */
class PropertySocialPreferencesSubmitted
{
    use Dispatchable;

    /** @param  array<string, mixed>  $preferences */
    public function __construct(public readonly int $propertyId, public readonly array $preferences) {}
}
