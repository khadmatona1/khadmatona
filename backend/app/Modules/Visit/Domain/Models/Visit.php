<?php

namespace App\Modules\Visit\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Models\User;
use App\Modules\Visit\Domain\Enums\VisitReportOutcome;
use App\Modules\Visit\Domain\Enums\VisitStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * `lead_id`/`property_id` are plain foreign-key columns only (no Eloquent
 * relation) - Lead and Property are peer business modules, PROJECT_RULES.md
 * §3 forbids importing another business module's model class directly.
 * Resolving either goes through that module's own repository interface
 * (see CreateVisitAction, VisitConfirmationSender, VisitController).
 *
 * `commercial_id` IS a real `belongsTo(User::class)` - `User` lives in
 * app/Models, not a business module, so it's Core-level shared reference
 * data (same treatment as `Property::commercial()`). Unlike Lead's
 * frozen-at-creation `commercial_id`, this one is mutable/reassignable via
 * `PATCH /visits/{visit}/assign` and is the real, current source of truth
 * for who's handling the visit.
 */
class Visit extends Model
{
    use LogsAllChanges, SoftDeletes;

    protected $fillable = [
        'lead_id',
        'property_id',
        'commercial_id',
        'scheduled_at',
        'status',
        'report',
        'report_outcome',
        'completed_at',
        'whatsapp_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => VisitStatus::class,
            'report_outcome' => VisitReportOutcome::class,
            'scheduled_at' => 'datetime',
            'completed_at' => 'datetime',
            'whatsapp_confirmed_at' => 'datetime',
        ];
    }

    public function commercial(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commercial_id');
    }
}
