<?php

namespace App\Modules\WhatsApp\Http\Requests;

use App\Core\Support\Phone\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Opens a thread with a customer by sending an approved template (WhatsApp's
 * only way to message someone who hasn't written first). `name`/`language`
 * fall back to WHATSAPP_DEFAULT_TEMPLATE(_LANGUAGE) when omitted.
 */
class StartConversationRequest extends FormRequest
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
            'phone' => ['required', 'string', 'max:32', function (string $attribute, mixed $value, \Closure $fail) {
                if (PhoneNumber::toE164((string) $value) === null) {
                    $fail(__('whatsapp.invalid_phone'));
                }
            }],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:512', 'regex:/^[a-z0-9_]+$/'],
            'language' => ['nullable', 'string', 'max:16', 'regex:/^[a-zA-Z_]+$/'],
            'params' => ['nullable', 'array', 'max:20'],
            'params.*' => ['required', 'string', 'max:1024'],
        ];
    }
}
