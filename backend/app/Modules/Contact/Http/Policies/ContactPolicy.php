<?php

namespace App\Modules\Contact\Http\Policies;

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;

/**
 * Per-instance authorization for a single already-resolved Contact - listing
 * scope lives in ContactFilter instead. Admin is granted every method here
 * implicitly via CorePermissionsServiceProvider's `Gate::before`; a
 * Commercial/SeniorCommercial only ever sees/acts on contacts they own.
 */
class ContactPolicy
{
    public function view(User $user, Contact $contact): bool
    {
        return $user->id === $contact->commercial_id;
    }

    public function update(User $user, Contact $contact): bool
    {
        return $user->id === $contact->commercial_id;
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->id === $contact->commercial_id;
    }
}
