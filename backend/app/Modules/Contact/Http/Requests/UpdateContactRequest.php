<?php

namespace App\Modules\Contact\Http\Requests;

use App\Modules\Contact\Domain\Enums\ContactType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
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
            'type' => ['required', Rule::enum(ContactType::class)],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/'],
            'whatsapp' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/'],
            'address' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'commercial_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
