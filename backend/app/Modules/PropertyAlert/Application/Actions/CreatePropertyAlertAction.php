<?php

namespace App\Modules\PropertyAlert\Application\Actions;

use App\Core\Support\Phone\PhoneNumber;
use App\Modules\PropertyAlert\Domain\Contracts\PropertyAlertRepositoryInterface;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use Illuminate\Support\Str;

/**
 * Normalizes the submitted contact info, computes the dedup fingerprint,
 * and either returns an already-existing alert or creates a new one -
 * the entire "prevent duplicate alerts for the same contact + same search
 * criteria" requirement lives here (PROJECT_RULES.md §11: business rules
 * belong in the Application layer, not the Form Request).
 */
class CreatePropertyAlertAction
{
    public function __construct(private readonly PropertyAlertRepositoryInterface $alerts) {}

    /**
     * @param  array<string, mixed>  $validated
     * @return array{alert: PropertyAlert, created: bool}
     */
    public function execute(array $validated): array
    {
        $email = isset($validated['email']) && $validated['email'] !== ''
            ? Str::lower(trim((string) $validated['email']))
            : null;
        $phone = PhoneNumber::toE164($validated['phone']);

        $criteria = [
            'city_id' => $validated['city_id'] ?? null,
            'district_id' => $validated['district_id'] ?? null,
            'property_type' => $validated['property_type'] ?? null,
            // API speaks MAD (decimal), the column stores cents - same
            // boundary crossing as PropertyController::toAttributes().
            'budget_max' => isset($validated['budget_max']) ? (int) round($validated['budget_max'] * 100) : null,
            'surface_min' => $validated['surface_min'] ?? null,
            'surface_max' => $validated['surface_max'] ?? null,
        ];
        // Omit unset new keys to preserve fingerprints of existing subscriptions.
        foreach (['transaction_type', 'price_period'] as $key) {
            if (isset($validated[$key])) {
                $criteria[$key] = $validated[$key];
            }
        }
        ksort($criteria);

        $fingerprint = hash('sha256', $phone.'|'.json_encode($criteria));

        if ($existing = $this->alerts->findByFingerprint($fingerprint)) {
            return ['alert' => $existing, 'created' => false];
        }

        $alert = $this->alerts->create([
            ...$criteria,
            'email' => $email,
            'phone_e164' => $phone,
            'locale' => app()->getLocale(),
            'fingerprint_hash' => $fingerprint,
        ]);

        return ['alert' => $alert, 'created' => true];
    }
}
