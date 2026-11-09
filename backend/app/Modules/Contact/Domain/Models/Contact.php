<?php

namespace App\Modules\Contact\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Models\User;
use App\Modules\Contact\Database\Factories\ContactFactory;
use App\Modules\Contact\Domain\Enums\ContactType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A buyer/seller/tenant/landlord as a first-class CRM entity, separate from
 * Lead (a Lead may later be linked to one via `leads.contact_id`, a bare FK
 * with no Eloquent relation on either side - PROJECT_RULES.md §3 forbids a
 * business module importing another's model class directly).
 *
 * `commercial_id` is a real `belongsTo(User::class)` - `User` lives in
 * app/Models, not a business module, so it's Core-level shared reference
 * data (same treatment as `Property::commercial()`), not a cross-module
 * relation.
 *
 * @use HasFactory<ContactFactory>
 */
class Contact extends Model
{
    /** @use HasFactory<ContactFactory> */
    use HasFactory, LogsAllChanges, SoftDeletes;

    protected $fillable = [
        'type',
        'name',
        'email',
        'phone',
        'whatsapp',
        'address',
        'notes',
        'commercial_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => ContactType::class,
        ];
    }

    /**
     * The Commercial who owns this contact - null for a contact created (or
     * reassigned) by an Admin with no owning Commercial.
     */
    public function commercial(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commercial_id');
    }

    protected static function newFactory(): ContactFactory
    {
        return ContactFactory::new();
    }
}
