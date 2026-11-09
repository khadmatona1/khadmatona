<?php

namespace App\Modules\Property\Http\Requests;

use App\Modules\Property\Domain\Enums\PropertyStatus;
use App\Modules\Property\Domain\Enums\PropertyType;
use App\Modules\Property\Http\Rules\AssignableCommercial;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePropertyRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'transaction_type' => ['nullable', Rule::in(['sale', 'rent'])],
            'price_period' => ['nullable', 'required_if:transaction_type,rent', 'prohibited_unless:transaction_type,rent', Rule::in(['month', 'night'])],
            'type' => ['required', Rule::enum(PropertyType::class)],
            'status' => ['sometimes', Rule::enum(PropertyStatus::class)],
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
            // Optional assignment to a commercial (Admin). PropertyController
            // overwrites this for Commercial accounts regardless of what's
            // submitted here.
            'commercial_id' => ['nullable', 'integer', new AssignableCommercial],
            // References the contacts table by name only - no
            // App\Modules\Contact model import (PROJECT_RULES.md §3).
            'owner_contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
            // Admin's social publishing choice - PropertyController ignores it
            // for everyone else.
            'social' => ['nullable', 'array'],
            'social.facebook' => ['sometimes', 'boolean'],
            'social.instagram' => ['sometimes', 'boolean'],
            'social.mode' => ['sometimes', Rule::in(['auto', 'manual'])],
        ];
    }
}
