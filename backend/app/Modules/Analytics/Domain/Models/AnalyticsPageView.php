<?php

namespace App\Modules\Analytics\Domain\Models;

use App\Modules\Analytics\Domain\Enums\PageType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * `property_id` is a bare column with no relation: Property is a peer
 * business module (PROJECT_RULES.md §3). Titles are resolved through
 * PropertyRepositoryInterface at report time.
 */
class AnalyticsPageView extends Model
{
    protected $table = 'analytics_page_views';

    protected $fillable = [
        'uuid',
        'session_id',
        'visitor_id',
        'path',
        'page_type',
        'property_id',
        'viewed_at',
        'duration_seconds',
    ];

    protected function casts(): array
    {
        return [
            'viewed_at' => 'datetime',
            'duration_seconds' => 'integer',
            'property_id' => 'integer',
            'page_type' => PageType::class,
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AnalyticsSession::class, 'session_id');
    }
}
