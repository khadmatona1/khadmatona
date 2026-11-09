<?php

namespace App\Core\Auth\Http\Requests;

use App\Modules\Contact\Domain\Models\Contact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
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
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            // Only meaningful (and required) for role=Owner - links the new
            // login back to the seller/landlord Contact it's for. Reaches
            // into Contact's Eloquent model for a validation-only read, the
            // same boundary crossing StorePropertyRequest's own
            // `exists:contacts,id` rule on owner_contact_id already makes.
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
