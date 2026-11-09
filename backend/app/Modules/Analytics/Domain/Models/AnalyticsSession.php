<?php

namespace App\Modules\Analytics\Domain\Models;

use App\Modules\Analytics\Domain\Enums\DeviceType;
use App\Modules\Analytics\Domain\Enums\TrafficSource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalyticsSession extends Model
{
    protected $table = 'analytics_sessions';

    protected $fillable = [
        'uuid',
        'visitor_id',
        'started_at',
        'last_activity_at',
        'duration_seconds',
        'page_views_count',
        'events_count',
        'landing_path',
        'exit_path',
        'referrer_host',
        'source',
        'medium',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'device_type',
        'browser',
        'os',
        'country',
        'city',
        'geo_source',
        'locale',
        'converted_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'converted_at' => 'datetime',
            'duration_seconds' => 'integer',
            'page_views_count' => 'integer',
            'events_count' => 'integer',
            'source' => TrafficSource::class,
            'device_type' => DeviceType::class,
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(AnalyticsVisitor::class, 'visitor_id');
    }

    public function pageViews(): HasMany
    {
        return $this->hasMany(AnalyticsPageView::class, 'session_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class, 'session_id');
    }

    public function formSessions(): HasMany
    {
        return $this->hasMany(AnalyticsFormSession::class, 'session_id');
    }
}
