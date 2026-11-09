<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Rental\Domain\Enums\ReservationChannel;
use App\Modules\Rental\Domain\Enums\ReservationStatus;
use App\Modules\Rental\Domain\Models\Concerns\ScopesSeniorRentals;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reservation extends Model
{
    use LogsAllChanges, SoftDeletes;
    use ScopesSeniorRentals;

    protected $table = 'rental_reservations';

    // Mirrors the migration's column defaults, so a freshly created model
    // (not re-read from the database) already carries them.
    protected $attributes = [
        'guests_count' => 1,
        'channel' => 'direct',
        'platform_fee' => 0,
        'status' => 'confirmed',
    ];

    protected $fillable = [
        'rental_property_id',
        'property_id',
        'guest_name',
        'guest_phone',
        'guest_email',
        'guests_count',
        'channel',
        'check_in_date',
        'check_out_date',
        'total_amount',
        'platform_fee',
        'commission_rate_bp',
        'status',
        'checked_in_at',
        'checked_out_at',
        'check_in_notes',
        'check_out_notes',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'guests_count' => 'integer',
            'channel' => ReservationChannel::class,
            'status' => ReservationStatus::class,
            'check_in_date' => 'date',
            'check_out_date' => 'date',
            'total_amount' => 'integer',
            'platform_fee' => 'integer',
            'commission_rate_bp' => 'integer',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    public function managedProperty(): BelongsTo
    {
        return $this->belongsTo(ManagedProperty::class, 'rental_property_id');
    }

    public function nights(): int
    {
        return (int) $this->check_in_date->diffInDays($this->check_out_date, true);
    }

    /** What the stay actually brings in: guest payment minus platform fee (cents). */
    public function netRevenue(): int
    {
        return max(0, $this->total_amount - $this->platform_fee);
    }
}
