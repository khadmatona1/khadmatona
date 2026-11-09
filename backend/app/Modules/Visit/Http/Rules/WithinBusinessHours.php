<?php

namespace App\Modules\Visit\Http\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Carbon;

/**
 * Keeps visit scheduling MVP-sized: a simple business-hours check, not a
 * slot/availability/conflict-checking engine. A double-booking is still
 * possible (visible on the calendar for staff to catch manually), never
 * prevented server-side - deliberate scope decision, not an oversight.
 */
class WithinBusinessHours implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $local = Carbon::parse($value)->timezone(config('app.business_timezone'));

        if ($local->dayOfWeek === Carbon::SUNDAY) {
            $fail('Les visites ne sont pas disponibles le dimanche.');

            return;
        }

        if ($local->hour < 9 || $local->hour >= 19) {
            $fail('Les visites sont disponibles entre 9h et 19h (heure du Maroc).');
        }
    }
}
