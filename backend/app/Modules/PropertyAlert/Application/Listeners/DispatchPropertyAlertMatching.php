<?php

namespace App\Modules\PropertyAlert\Application\Listeners;

use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\PropertyAlert\Application\Jobs\MatchPropertyAlertsJob;

/**
 * The sanctioned cross-module reaction point (PROJECT_RULES.md §3): imports
 * Property's Domain Event, never its Eloquent model.
 */
class DispatchPropertyAlertMatching
{
    public function handle(PropertyApproved $event): void
    {
        MatchPropertyAlertsJob::dispatch($event->propertyId);
    }
}
