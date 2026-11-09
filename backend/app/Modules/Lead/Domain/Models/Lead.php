<?php

namespace App\Modules\Lead\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\Lead\Domain\Enums\LeadStatus;
use App\Modules\Lead\Domain\Enums\LeadType;
use App\Modules\Lead\Domain\Enums\PropertyRequestType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * `property_id` is a plain foreign-key column (DB-level constraint set up
 * in the migration) rather than an Eloquent relationship - PROJECT_RULES.md
 * §3 forbids importing another business module's model class directly.
 * Resolving the related property, if ever needed, goes through the
 * Property module's own repository/contract, not a cross-module relation.
 *
 * `property_details` holds whatever fields the sell/rent form's selected
 * `property_type` calls for (see the frontend's property-request-fields.ts)
 * as a flat key => value map, rather than one DB column per possible field.
 *
 * `commercial_id` is denormalized from the referenced property's own
 * `commercial_id` at creation time (StoreLeadController) - same bare-FK,
 * no-relation treatment as `property_id`. Admins may also assign or
 * reassign any lead directly to a Commercial or SeniorCommercial.
 *
 * `contact_id` is the same bare-FK, no-relation treatment - links this lead
 * to a Contact (buyer/seller/tenant/landlord, App\Modules\Contact) once one
 * has been manually identified/linked from the dashboard
 * (LeadController::updateContact()). Never auto-set at capture time.
 */
class Lead extends Model implements HasMedia
{
    use InteractsWithMedia, LogsAllChanges, SoftDeletes;

    protected $fillable = [
        'type',
        'status',
        'name',
        'email',
        'phone',
        'message',
        'property_id',
        'property_type',
        'city',
        'district',
        'address',
        'property_details',
        'commercial_id',
        'contact_id',
        'callback_at',
        'callback_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => LeadType::class,
            'status' => LeadStatus::class,
            'property_type' => PropertyRequestType::class,
            'property_details' => 'array',
            'callback_at' => 'datetime',
            'callback_notified_at' => 'datetime',
        ];
    }
}
