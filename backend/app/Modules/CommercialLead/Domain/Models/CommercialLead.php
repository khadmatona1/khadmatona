<?php

namespace App\Modules\CommercialLead\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use App\Modules\CommercialLead\Domain\Enums\CommercialLeadStatus;
use App\Modules\CommercialLead\Domain\Enums\CommercialPropertyType;
use App\Modules\CommercialLead\Domain\Enums\ProfessionalType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * `partner_user_id` is a plain, currently-unused foreign-key column (see the
 * migration) reserved for once a Partner/Commercial account system exists -
 * a lead moved to PARTNER can then be linked to a real user without a
 * schema change. No Eloquent relationship is declared for it yet, same
 * minimalism as Lead's `property_id` (PROJECT_RULES.md §3).
 */
class CommercialLead extends Model
{
    use LogsAllChanges, SoftDeletes;

    protected $fillable = [
        'full_name',
        'company_name',
        'email',
        'phone',
        'whatsapp',
        'city',
        'address',
        'position',
        'professional_type',
        'portfolio_size',
        'property_types',
        'collaboration_type',
        'message',
        'source',
        'status',
        'partner_user_id',
    ];

    protected function casts(): array
    {
        return [
            'professional_type' => ProfessionalType::class,
            'portfolio_size' => 'integer',
            'property_types' => 'array',
            'status' => CommercialLeadStatus::class,
        ];
    }
}
