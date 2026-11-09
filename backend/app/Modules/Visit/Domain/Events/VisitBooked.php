<?php

namespace App\Modules\Visit\Domain\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired once a brand-new visit booking (Lead + Visit) has actually
 * committed to the database - never re-dispatched for a reschedule
 * (SendVisitConfirmationJob is re-dispatched directly there instead, see
 * VisitController::reschedule()). Carries only the primitive id, not the
 * Visit model, so the (queued) listener always re-reads current data.
 */
class VisitBooked
{
    use Dispatchable;

    public function __construct(public readonly int $visitId) {}
}
