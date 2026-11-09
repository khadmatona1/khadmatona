<?php

namespace App\Modules\PropertyAlert\Domain\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per (alert, property) pair ever matched - the exactly-once
 * notify log, claimed via insertOrIgnore() in PropertyAlertMatcher.
 * Deliberately no `property()` relation: Property is a peer business
 * module (PROJECT_RULES.md §3), so `property_id` stays a bare FK column.
 * Only `created_at` is meaningful - no `updated_at` column exists.
 */
class PropertyAlertMatch extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'property_alert_id',
        'property_id',
        'whatsapp_sent_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'whatsapp_sent_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function propertyAlert(): BelongsTo
    {
        return $this->belongsTo(PropertyAlert::class);
    }
}
