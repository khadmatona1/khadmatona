<?php

namespace App\Modules\Property\Domain\Enums;

/**
 * Moderation state for a property submitted by a Commercial - distinct from
 * `PropertyStatus`, which is the listing's own availability
 * (disponible/reserve/vendu/loue). A property can be `approved` and
 * `vendu` at the same time; these two enums are orthogonal.
 */
enum PropertyApprovalStatus: string
{
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
