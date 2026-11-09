<?php

namespace App\Modules\PropertyAlert\Application\Jobs;

use App\Modules\PropertyAlert\Application\PropertyAlertMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Matching + a WhatsApp send is not required to answer the HTTP request
 * that approved the property (PROJECT_RULES.md §6), so it's queued. Only
 * the property id is carried, not a model snapshot - the matcher re-reads
 * current data, so a retry is always safe.
 */
class MatchPropertyAlertsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public function __construct(public readonly int $propertyId) {}

    public function handle(PropertyAlertMatcher $matcher): void
    {
        $matcher->match($this->propertyId);
    }
}
