<?php

namespace App\Modules\CommercialLead\Http\Requests;

use App\Modules\CommercialLead\Domain\Enums\CommercialPropertyType;
use App\Modules\CommercialLead\Domain\Enums\ProfessionalType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommercialLeadRequest extends FormRequest
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
        // Same phone-shape closure as Lead's StoreLeadRequest: written with
        // a "+" country code (any country) the number must total 12 digits;
        // written locally with no country code, 10 digits.
        $phoneShape = function (string $attribute, mixed $value, \Closure $fail) {
            $hasCountryCode = str_starts_with(trim((string) $value), '+');
            $digits = (string) preg_replace('/\D/', '', (string) $value);
            $expected = $hasCountryCode ? 12 : 10;
            if (strlen($digits) !== $expected) {
                $fail('The :attribute must be a valid phone number.');
            }
        };

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            // Phone is the primary way to reach a partner applicant, so it's
            // required while email is optional - the reverse of most public
            // forms in this project, but matches how this audience actually
            // prefers to be contacted (phone/WhatsApp over email).
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/', $phoneShape],
            'whatsapp' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/', $phoneShape],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'professional_type' => ['required', Rule::enum(ProfessionalType::class)],
            'portfolio_size' => ['nullable', 'integer', 'min:0'],
            'property_types' => ['nullable', 'array', 'max:6'],
            'property_types.*' => [Rule::enum(CommercialPropertyType::class)],
            'collaboration_type' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
            'source' => ['nullable', 'string', 'max:255'],
        ];
    }
}
