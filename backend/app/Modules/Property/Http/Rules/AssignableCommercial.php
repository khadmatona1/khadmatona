<?php

namespace App\Modules\Property\Http\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An Admin can assign a property to a commercial: the value must be an
 * active user holding the Commercial or SeniorCommercial role, never an
 * Admin, Owner, role-less or deactivated account.
 *
 * On edit, the property's CURRENT assignee is always accepted, so an Admin
 * can still save other changes on a listing whose commercial has since been
 * deactivated without being forced to reassign it first.
 *
 * Only meaningful for Admin requests: PropertyController::applyOwnership()
 * overwrites commercial_id with the caller's own id for Commercial accounts.
 */
class AssignableCommercial implements ValidationRule
{
    public const ROLES = ['Commercial', 'SeniorCommercial'];

    public function __construct(private readonly ?int $currentCommercialId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if ($this->currentCommercialId !== null && (int) $value === $this->currentCommercialId) {
            return;
        }

        $assignable = User::query()
            ->whereKey((int) $value)
            ->where('is_active', true)
            ->role(self::ROLES)
            ->exists();

        if (! $assignable) {
            $fail('The selected commercial must be an active Commercial or Senior Commercial account.');
        }
    }
}
