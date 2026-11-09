<?php

namespace App\Modules\CommercialLead\Http\Requests;

use App\Modules\CommercialLead\Domain\Enums\CommercialLeadStatus;
use Illuminate\Validation\Rule;

class ImportCommercialLeadsRequest extends StoreCommercialLeadRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Admin') ?? false;
    }

    public function rules(): array
    {
        $fields = array_intersect_key(parent::rules(), array_flip([
            'full_name', 'company_name', 'email', 'phone', 'whatsapp', 'city',
            'address', 'position', 'professional_type', 'message',
        ]));
        $internationalPhone = ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/', function (string $attribute, mixed $value, \Closure $fail) {
            $length = strlen((string) preg_replace('/\D/', '', (string) $value));
            if ($length < 8 || $length > 15) {
                $fail('The :attribute must be a valid phone number.');
            }
        }];
        $fields['phone'] = [...$internationalPhone, 'required'];
        $fields['whatsapp'] = $internationalPhone;
        $fields['status'] = ['required', Rule::enum(CommercialLeadStatus::class)];
        $rules = [
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*' => ['required', 'array:'.implode(',', array_keys($fields))],
        ];
        foreach ($fields as $field => $constraints) {
            $rules['rows.*.'.$field] = $constraints;
        }

        return $rules;
    }
}
