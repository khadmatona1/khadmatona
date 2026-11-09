<?php

namespace App\Modules\InternalChat\Domain\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternalMessage extends Model
{
    protected $fillable = ['channel', 'sender_id', 'recipient_id', 'body', 'client_id'];

    protected $hidden = ['client_id'];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
