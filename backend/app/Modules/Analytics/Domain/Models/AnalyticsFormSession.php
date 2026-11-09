<?php

namespace App\Modules\Analytics\Domain\Models;

use App\Modules\Analytics\Domain\Enums\FormSessionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One engaged form instance. `fields_interacted` holds field NAMES only.
 */
class AnalyticsFormSession extends Model
{
    protected $table = 'analytics_form_sessions';

    protected $fillable = [
        'uuid',
        'session_id',
        'visitor_id',
        'form_type',
        'property_id',
        'status',
        'started_at',
        'last_interaction_at',
        'fields_interacted',
        'last_field',
        'last_step',
        'submitted_at',
        'abandoned_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => FormSessionStatus::class,
            'started_at' => 'datetime',
            'last_interaction_at' => 'datetime',
            'submitted_at' => 'datetime',
            'abandoned_at' => 'datetime',
            'fields_interacted' => 'array',
            'property_id' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AnalyticsSession::class, 'session_id');
    }
}
