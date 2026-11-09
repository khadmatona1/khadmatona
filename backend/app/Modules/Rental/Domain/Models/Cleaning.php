<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Domain\Enums\CleaningStatus;
use App\Modules\Rental\Domain\Models\Concerns\ScopesSeniorRentals;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cleaning extends Model
{
    use LogsAllChanges, SoftDeletes;
    use ScopesSeniorRentals;

    protected $table = 'rental_cleanings';

    // Mirrors the migration's column defaults, so a freshly created model
    // (not re-read from the database) already carries them.
    protected $attributes = [
        'status' => 'pending',
        'cost' => 0,
        'charged_to' => 'owner',
    ];

    protected $fillable = [
        'rental_property_id',
        'property_id',
        'reservation_id',
        'scheduled_for',
        'status',
        'cleaner_name',
        'cost',
        'charged_to',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'reservation_id' => 'integer',
            'scheduled_for' => 'date',
            'status' => CleaningStatus::class,
            'cost' => 'integer',
            'charged_to' => ChargedTo::class,
            'completed_at' => 'datetime',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }
}
