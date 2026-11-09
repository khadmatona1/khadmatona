<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Domain\Enums\MaintenancePriority;
use App\Modules\Rental\Domain\Enums\MaintenanceStatus;
use App\Modules\Rental\Domain\Models\Concerns\ScopesSeniorRentals;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaintenanceRequest extends Model
{
    use LogsAllChanges, SoftDeletes;
    use ScopesSeniorRentals;

    protected $table = 'rental_maintenance_requests';

    // Mirrors the migration's column defaults, so a freshly created model
    // (not re-read from the database) already carries them.
    protected $attributes = [
        'priority' => 'normal',
        'status' => 'open',
        'cost' => 0,
        'charged_to' => 'owner',
    ];

    protected $fillable = [
        'rental_property_id',
        'property_id',
        'title',
        'description',
        'priority',
        'status',
        'provider_name',
        'reported_on',
        'resolved_at',
        'cost',
        'charged_to',
    ];

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'priority' => MaintenancePriority::class,
            'status' => MaintenanceStatus::class,
            'reported_on' => 'date',
            'resolved_at' => 'datetime',
            'cost' => 'integer',
            'charged_to' => ChargedTo::class,
        ];
    }
}
