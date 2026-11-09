<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Domain\Models\Concerns\ScopesSeniorRentals;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A catalog property under KHADMATONA rental management ("mise en gestion")
 * and its terms. `property_id` is a bare column with no relation: Property
 * is a peer business module (PROJECT_RULES.md §3).
 */
class ManagedProperty extends Model
{
    use LogsAllChanges, SoftDeletes;
    use ScopesSeniorRentals;

    protected $table = 'rental_properties';

    // Mirrors the migration's column defaults, so a freshly created model
    // (not re-read from the database) already carries them.
    protected $attributes = [
        'commission_rate_bp' => 2000,
        'cleaning_fee' => 0,
        'cleaning_charged_to' => 'owner',
        'is_active' => true,
        'approval_status' => 'approved',
    ];

    protected $fillable = [
        'property_id',
        'commission_rate_bp',
        'cleaning_fee',
        'cleaning_charged_to',
        'is_active',
        'approval_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'commission_rate_bp' => 'integer',
            'cleaning_fee' => 'integer',
            'cleaning_charged_to' => ChargedTo::class,
            'is_active' => 'boolean',
        ];
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'rental_property_id');
    }
}
