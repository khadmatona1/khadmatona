<?php

namespace App\Modules\WhatsApp\Application;

use App\Core\Support\Phone\PhoneNumber;
use App\Models\User;
use App\Modules\WhatsApp\Domain\Contracts\ConversationRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\CustomerDirectory;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Finds - or creates and auto-links - the conversation for a customer
 * number. Used by both directions: a customer writing to us (webhook) and a
 * staff member starting a thread with a template.
 */
class ConversationService
{
    public function __construct(
        private readonly ConversationRepositoryInterface $conversations,
        private readonly CustomerDirectory $directory,
    ) {}

    /**
     * @param  string  $waId  Customer's number, digits only (Meta's wa_id).
     * @param  User|null  $starter  The staff member opening the thread, null for an inbound-initiated one.
     */
    public function findOrCreate(string $waId, ?string $profileName = null, ?User $starter = null): Conversation
    {
        $existing = $this->conversations->findByWaId($waId);

        if ($existing) {
            if (filled($profileName) && $existing->contact_name !== $profileName) {
                $existing->update(['contact_name' => $profileName]);
            }

            return $existing;
        }

        $e164 = PhoneNumber::toE164('+'.$waId);

        // A non-Admin only auto-links records they own; an Admin (or an
        // inbound-initiated thread) links whatever is unambiguous.
        $restrictTo = $starter && ! $starter->hasRole('Admin') ? $starter->id : null;
        $lead = $e164 ? $this->directory->findLeadByPhone($e164, $restrictTo) : null;
        $contact = $e164 ? $this->directory->findContactByPhone($e164, $restrictTo) : null;

        $assignedUserId = $restrictTo ?? $lead['commercial_id'] ?? $contact['commercial_id'] ?? null;

        try {
            /** @var Conversation */
            return $this->conversations->create([
                'wa_id' => $waId,
                'phone' => $e164,
                'contact_name' => $profileName,
                'lead_id' => $lead['id'] ?? null,
                'contact_id' => $contact['id'] ?? null,
                'assigned_user_id' => $assignedUserId,
            ]);
        } catch (UniqueConstraintViolationException) {
            // Two webhook deliveries raced to create the same thread.
            return $this->conversations->findByWaId($waId) ?? throw new \LogicException('Conversation vanished after a unique violation.');
        }
    }
}
