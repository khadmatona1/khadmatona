<?php

namespace App\Modules\Rental\Domain\Enums;

/**
 * Where the booking came from (the platform may keep a fee).
 */
enum ReservationChannel: string
{
    case Direct = 'direct';
    case Airbnb = 'airbnb';
    case Booking = 'booking';
    case Other = 'other';
}
