<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Rental\Domain\Models\Concerns\ScopesSeniorRentals;
use Illuminate\Database\Eloquent\Model;

class BookingRequest extends Model
{
    use LogsAllChanges;
    use ScopesSeniorRentals;

    protected $table = 'rental_booking_requests';

    protected $fillable = ['reference', 'request_key', 'fingerprint', 'rental_property_id', 'property_id', 'guest_name', 'guest_phone', 'guest_email', 'guests_count', 'check_in_date', 'check_out_date', 'notes', 'status', 'reservation_id', 'consented_at'];

    protected $hidden = ['request_key', 'fingerprint'];

    protected function casts(): array
    {
        return ['check_in_date' => 'date:Y-m-d', 'check_out_date' => 'date:Y-m-d', 'consented_at' => 'datetime', 'guests_count' => 'integer', 'property_id' => 'integer'];
    }
}
