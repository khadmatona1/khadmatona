<?php

namespace App\Modules\Lead\Http\Requests;

use App\Modules\Lead\Domain\Enums\LeadType;
use App\Modules\Lead\Domain\Enums\PropertyRequestType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
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
            'type' => ['required', Rule::enum(LeadType::class)],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            // International numbers use a country code and up to 15 digits.
            // Moroccan mobile/landline numbers may also use local notation.
            'phone' => [Rule::requiredIf(! $this->filled('email')), 'nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/', function (string $attribute, mixed $value, \Closure $fail) {
                $normalized = (string) preg_replace('/[\s.()\-]/', '', (string) $value);
                $normalized = (string) preg_replace('/^00/', '+', $normalized);
                if (! preg_match('/^(?:\+[1-9]\d{6,14}|0[5-7]\d{8})$/', $normalized)) {
                    $fail('The :attribute must be a valid phone number.');
                }
            }],
            'message' => ['nullable', 'string', 'max:5000'],
            'photos' => ['nullable', 'array', 'max:10', function (string $attribute, mixed $value, \Closure $fail) {
                // Keep multipart submissions within the frontend proxy's body limit.
                if (is_array($value) && array_sum(array_map(
                    fn ($file) => $file instanceof UploadedFile ? $file->getSize() : 0,
                    $value,
                )) > 3 * 1024 * 1024) {
                    $fail('The photos must not exceed 3 MB in total.');
                }
            }],
            'photos.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'property_id' => ['nullable', 'integer', 'exists:properties,id', 'required_if:type,visit_request'],
            'property_type' => ['nullable', Rule::enum(PropertyRequestType::class)],
            'city' => ['nullable', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            // Deliberately generic (no per-field-name rules) so a new
            // property_type/field on the frontend never needs a matching
            // backend change - just a size cap and a scalar-value guard
            // against abuse.
            'property_details' => ['nullable', 'array', 'max:30'],
            'property_details.*' => [function (string $attribute, mixed $value, \Closure $fail) {
                if (! is_scalar($value) && ! is_null($value)) {
                    $fail('The :attribute must be a simple value.');
                }
            }],
        ];
    }
}
