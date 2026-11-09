<?php

namespace App\Modules\Visit\Http\Requests;

use App\Modules\Visit\Http\Rules\WithinBusinessHours;
use Illuminate\Foundation\Http\FormRequest;

class StoreVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            // Required, unlike Lead's own nullable phone - this feature's
            // WhatsApp confirmation is the only delivery channel, same
            // reasoning as StorePropertyAlertRequest's phone-required rule.
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/', function (string $attribute, mixed $value, \Closure $fail) {
                $hasCountryCode = str_starts_with(trim((string) $value), '+');
                $digits = (string) preg_replace('/\D/', '', (string) $value);
                $expected = $hasCountryCode ? 12 : 10;
                if (strlen($digits) !== $expected) {
                    $fail('The :attribute must be a valid phone number.');
                }
            }],
            'property_id' => ['required', 'integer', 'exists:properties,id'],
            'message' => ['nullable', 'string', 'max:5000'],
            'scheduled_at' => ['required', 'date', 'after:now', new WithinBusinessHours],
        ];
    }
}
