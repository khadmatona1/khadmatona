<?php

namespace App\Modules\Rental\Domain\Enums;

/**
 * confirmed -> checked_in -> checked_out, or cancelled before check-in.
 */
enum ReservationStatus: string
{
    case Confirmed = 'confirmed';
    case CheckedIn = 'checked_in';
    case CheckedOut = 'checked_out';
    case Cancelled = 'cancelled';
}
