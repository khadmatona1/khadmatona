<?php

namespace App\Modules\Analytics\Domain\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only: rows are never updated, so there is no updated_at column.
 */
class AnalyticsEvent extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'analytics_events';

    protected $fillable = [
        'session_id',
        'visitor_id',
        'event_type',
        'path',
        'property_id',
        'form_type',
        'field',
        'label',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'property_id' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AnalyticsSession::class, 'session_id');
    }
}
