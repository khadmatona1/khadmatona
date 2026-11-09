<?php

namespace App\Modules\Visit\Domain\Enums;

/**
 * The vocabulary doubles as the status-transition signal when a report is
 * submitted: every outcome sets status=Completed except NoShow, which sets
 * status=NoShow instead - no separate field needed (see VisitController::report()).
 */
enum VisitReportOutcome: string
{
    case Interested = 'interested';
    case NotInterested = 'not_interested';
    case FollowUp = 'follow_up';
    case NoShow = 'no_show';
}
