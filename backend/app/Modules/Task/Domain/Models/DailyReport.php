<?php

namespace App\Modules\Task\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReport extends Model
{
    use LogsAllChanges;

    protected $fillable = ['user_id', 'report_date', 'content'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
