<?php

namespace App\Modules\Property\Http\Requests;

use App\Modules\Property\Domain\Enums\PropertyStatus;
use App\Modules\Property\Domain\Enums\PropertyType;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Property\Http\Rules\AssignableCommercial;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    private function currentCommercialId(): ?int
    {
        $property = $this->route('property');

        return $property instanceof Property ? $property->commercial_id : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'transaction_type' => ['nullable', Rule::in(['sale', 'rent'])],
            'price_period' => ['nullable', 'required_if:transaction_type,rent', 'prohibited_unless:transaction_type,rent', Rule::in(['month', 'night'])],
            'type' => ['required', Rule::enum(PropertyType::class)],
            'status' => ['required', Rule::enum(PropertyStatus::class)],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            'address' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'surface' => ['required', 'integer', 'min:0'],
            'bedrooms' => ['sometimes', 'integer', 'min:0', 'max:255'],
            'bathrooms' => ['sometimes', 'integer', 'min:0', 'max:255'],
            'description' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            // Optional (re)assignment to a commercial, or null to unassign
            // (Admin). PropertyController overwrites this for Commercial
            // accounts regardless of what's submitted here.
            'commercial_id' => ['nullable', 'integer', new AssignableCommercial($this->currentCommercialId())],
            'owner_contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
        ];
    }
}
