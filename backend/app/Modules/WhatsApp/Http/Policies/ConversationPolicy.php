<?php

namespace App\Modules\WhatsApp\Http\Policies;

use App\Models\User;
use App\Modules\WhatsApp\Domain\Models\Conversation;

/**
 * Per-conversation authorization; listing scope lives in ConversationFilter.
 * Admin is granted everything implicitly via CorePermissionsServiceProvider's
 * `Gate::before`. A Commercial/SeniorCommercial only ever touches threads
 * assigned to them - unassigned threads are Admin-only, exactly like a lead
 * with no owning commercial.
 */
class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->assigned_user_id !== null && $user->id === $conversation->assigned_user_id;
    }

    /** Sending messages and marking as read. */
    public function reply(User $user, Conversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }
}
