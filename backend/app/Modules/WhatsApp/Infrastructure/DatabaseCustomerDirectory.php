<?php

namespace App\Modules\WhatsApp\Infrastructure;

use App\Core\Support\Phone\PhoneNumber;
use App\Modules\WhatsApp\Domain\Contracts\CustomerDirectory;
use Illuminate\Support\Facades\DB;

/**
 * Resolves a WhatsApp number to a lead/contact by table name only - no
 * import of the Lead/Contact modules' models (PROJECT_RULES.md §3), the same
 * way `exists:contacts,id` validation references a foreign table.
 *
 * Phones are stored however the visitor typed them ("06 12...", "+212..."),
 * so a LIKE on the last 9 digits (separators stripped in SQL) narrows
 * candidates and each is then compared in normalized E.164 form.
 */
class DatabaseCustomerDirectory implements CustomerDirectory
{
    public function findLeadByPhone(string $e164, ?int $onlyOwnedByUserId = null): ?array
    {
        return $this->findUnique('leads', $e164, $onlyOwnedByUserId);
    }

    public function findContactByPhone(string $e164, ?int $onlyOwnedByUserId = null): ?array
    {
        return $this->findUnique('contacts', $e164, $onlyOwnedByUserId);
    }

    /**
     * @return array{id: int, commercial_id: ?int}|null
     */
    private function findUnique(string $table, string $e164, ?int $onlyOwnedByUserId): ?array
    {
        $key = PhoneNumber::matchKey($e164);

        if ($key === null) {
            return null;
        }

        $matches = DB::table($table)
            ->whereNull('deleted_at')
            // Strip the separators people type ("06 12-34.56") so the digits are
            // contiguous; $key is digits-only and passed as a binding.
            ->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', ''), '(', ''), ')', '') LIKE ?", ['%'.$key.'%'])
            ->when($onlyOwnedByUserId !== null, fn ($q) => $q->where('commercial_id', $onlyOwnedByUserId))
            ->get(['id', 'phone', 'commercial_id'])
            ->filter(fn ($row) => PhoneNumber::toE164($row->phone) === $e164)
            ->values();

        // Ambiguous (several records share a number) or none: don't guess.
        if ($matches->count() !== 1) {
            return null;
        }

        return [
            'id' => (int) $matches[0]->id,
            'commercial_id' => $matches[0]->commercial_id !== null ? (int) $matches[0]->commercial_id : null,
        ];
    }
}
