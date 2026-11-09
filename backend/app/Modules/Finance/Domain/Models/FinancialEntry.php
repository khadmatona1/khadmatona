<?php

namespace App\Modules\Finance\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialEntry extends Model
{
    use LogsAllChanges, SoftDeletes;

    protected $fillable = ['kind', 'label', 'amount_cents', 'occurred_on', 'paid_on', 'property_id', 'commercial_id', 'created_by', 'notes'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'property_id' => 'integer', 'commercial_id' => 'integer', 'occurred_on' => 'date:Y-m-d', 'paid_on' => 'date:Y-m-d'];
    }
}
