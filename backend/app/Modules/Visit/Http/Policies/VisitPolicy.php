<?php

namespace App\Modules\Visit\Http\Policies;

use App\Models\User;
use App\Modules\Visit\Domain\Models\Visit;

/**
 * Per-instance authorization for a single already-resolved Visit - listing
 * scope lives in VisitFilter instead. Admin is granted implicitly via
 * CorePermissionsServiceProvider's `Gate::before`. `manage` is shared by
 * reschedule/report/cancel (all three genuinely need the identical check,
 * unlike Lead's conceptually distinct per-action abilities). `assign` has
 * no method here at all - Admin-only, gated purely by route `role:Admin`
 * middleware, same precedent as LeadController::destroy().
 */
class VisitPolicy
{
    public function view(User $user, Visit $visit): bool
    {
        return $visit->commercial_id !== null && $user->id === $visit->commercial_id;
    }

    public function manage(User $user, Visit $visit): bool
    {
        return $visit->commercial_id !== null && $user->id === $visit->commercial_id;
    }
}
