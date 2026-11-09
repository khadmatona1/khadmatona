<?php

namespace App\Core\ActivityLog\Concerns;

use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Default activity-log conduct for every module's models: log all
 * fillable attribute changes, skip no-op saves, and record only what
 * actually changed rather than the full attribute set.
 */
trait LogsAllChanges
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
