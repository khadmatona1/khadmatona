<?php

namespace App\Modules\Visit\Application\Listeners;

use App\Modules\Visit\Application\Jobs\SendVisitConfirmationJob;
use App\Modules\Visit\Domain\Events\VisitBooked;

class DispatchVisitConfirmation
{
    public function handle(VisitBooked $event): void
    {
        SendVisitConfirmationJob::dispatch($event->visitId);
    }
}
