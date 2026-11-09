<?php

namespace App\Modules\WhatsApp\Domain\Contracts;

/**
 * Looks up who a WhatsApp number belongs to among the CRM records other
 * modules own (leads, contacts) - via this contract rather than importing
 * their models (PROJECT_RULES.md §3).
 */
interface CustomerDirectory
{
    /**
     * The lead this number belongs to, only when it's unambiguous (exactly one
     * match) - never guesses between several. When $onlyOwnedByUserId is
     * given, leads owned by anyone else don't count.
     *
     * @return array{id: int, commercial_id: ?int}|null
     */
    public function findLeadByPhone(string $e164, ?int $onlyOwnedByUserId = null): ?array;

    /**
     * @return array{id: int, commercial_id: ?int}|null
     */
    public function findContactByPhone(string $e164, ?int $onlyOwnedByUserId = null): ?array;
}
