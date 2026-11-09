<?php

namespace App\Modules\Property\Http\Policies;

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;

/**
 * Per-instance authorization for a single already-resolved Property -
 * listing-level scoping (which rows a query even returns) lives in
 * PropertyFilter instead; this only answers "can this specific caller act
 * on this specific property". Admin is granted every method here
 * implicitly via CorePermissionsServiceProvider's `Gate::before`, so these
 * methods only need to encode the Commercial-ownership rule.
 *
 * `view` is used exclusively by the authenticated dashboardShow() route -
 * the *public* show() route never calls this policy at all, it enforces
 * approved-only directly in the controller. So `view` deliberately does
 * NOT have an "anyone may see an approved property" branch: being
 * publicly visible doesn't make a property yours to manage in the
 * dashboard - only the owning Commercial (or Admin, via Gate::before) may
 * open it there, regardless of its approval_status.
 */
class PropertyPolicy
{
    public function view(User $user, Property $property): bool
    {
        if ($user->hasRole('Owner')) {
            return $user->contact_id !== null && $user->contact_id === $property->owner_contact_id;
        }

        return $user->id === $property->commercial_id;
    }

    public function update(User $user, Property $property): bool
    {
        return $user->id === $property->commercial_id;
    }

    public function delete(User $user, Property $property): bool
    {
        return $user->id === $property->commercial_id;
    }

    /**
     * Explicit, redundant with Gate::before on purpose - same defensive
     * style CorePermissionsServiceProvider's own `access-admin-panel` gate
     * already uses, so this reads correctly even if Gate::before's Admin
     * bypass is ever changed.
     */
    public function approve(User $user): bool
    {
        return $user->hasRole('Admin');
    }

    public function reject(User $user): bool
    {
        return $user->hasRole('Admin');
    }
}
