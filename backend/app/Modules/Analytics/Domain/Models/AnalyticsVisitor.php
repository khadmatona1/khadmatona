<?php

namespace App\Modules\Analytics\Domain\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An anonymous browser. Deliberately no LogsAllChanges: this is
 * high-volume telemetry, not a business entity with an audit trail.
 */
class AnalyticsVisitor extends Model
{
    protected $table = 'analytics_visitors';

    protected $fillable = [
        'uuid',
        'first_seen_at',
        'last_seen_at',
        'sessions_count',
    ];

    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'sessions_count' => 'integer',
        ];
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AnalyticsSession::class, 'visitor_id');
    }
}
