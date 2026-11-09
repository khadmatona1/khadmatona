<?php

namespace App\Core\Auth\Http\Requests;

use App\Modules\Contact\Domain\Models\Contact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
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
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')),
            ],
            // Optional on edit - a blank password means "keep the current
            // one" (StoreUserRequest's password stays required for create).
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'is_active' => ['sometimes', 'boolean'],
            // Same rule as StoreUserRequest - see its own comment.
            'contact_id' => [
                'required_if:role,Owner',
                'nullable',
                'integer',
                'exists:contacts,id',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value === null) {
                        return;
                    }
                    $type = Contact::find($value)?->type?->value;
                    if (! in_array($type, ['seller', 'landlord'], true)) {
                        $fail('The selected contact must be a seller or landlord.');
                    }
                },
            ],
        ];
    }
}
