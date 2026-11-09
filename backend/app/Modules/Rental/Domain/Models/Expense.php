<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Domain\Enums\ExpenseCategory;
use App\Modules\Rental\Domain\Models\Concerns\ScopesSeniorRentals;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use LogsAllChanges, SoftDeletes;
    use ScopesSeniorRentals;

    protected $table = 'rental_expenses';

    // Mirrors the migration's column defaults, so a freshly created model
    // (not re-read from the database) already carries them.
    protected $attributes = [
        'charged_to' => 'owner',
    ];

    protected $fillable = [
        'rental_property_id',
        'property_id',
        'category',
        'label',
        'amount',
        'incurred_on',
        'charged_to',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'category' => ExpenseCategory::class,
            'amount' => 'integer',
            'incurred_on' => 'date',
            'charged_to' => ChargedTo::class,
        ];
    }
}
