<?php

namespace App\Modules\Task\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeamTask extends Model
{
    use LogsAllChanges, SoftDeletes;

    protected $fillable = ['creator_id', 'assignee_id', 'title', 'description', 'priority', 'status', 'due_at', 'checklist', 'report'];

    protected function casts(): array
    {
        return ['due_at' => 'datetime', 'checklist' => 'array'];
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }
}
