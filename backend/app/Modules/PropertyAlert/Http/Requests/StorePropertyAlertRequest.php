<?php

namespace App\Modules\PropertyAlert\Http\Requests;

use App\Core\Support\Phone\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePropertyAlertRequest extends FormRequest
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
            // The only delivery channel this feature has - required, unlike
            // every other public capture form in this codebase where phone
            // is optional (Lead/CommercialLead/Contact).
            'phone' => [
                'required',
                'string',
                'max:30',
                'regex:/^\+?[0-9\s\-().]+$/',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (PhoneNumber::toE164($value) === null) {
                        $fail('The :attribute must be a valid phone number.');
                    }
                },
            ],
            // Informational only - not used to send anything in this pass.
            'email' => ['nullable', 'email:rfc', 'max:255'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            // A literal value list, not Property's PropertyType enum class -
            // business modules never `use` each other's classes
            // (PROJECT_RULES.md §3). Keep in sync with
            // App\Modules\Property\Domain\Enums\PropertyType.
            'property_type' => ['nullable', Rule::in(['appartement', 'villa', 'riad', 'maison', 'terrain', 'bureau', 'local'])],
            'transaction_type' => ['nullable', Rule::in(['sale', 'rent'])],
            'price_period' => ['nullable', 'prohibited_unless:transaction_type,rent', Rule::in(['month', 'night'])],
            'budget_max' => ['nullable', 'numeric', 'min:0'],
            'surface_min' => ['nullable', 'integer', 'min:0'],
            'surface_max' => ['nullable', 'integer', 'min:0', 'gte:surface_min'],
        ];
    }
}
