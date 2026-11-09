<?php

namespace App\Modules\WhatsApp\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared shape for "send an approved template": used on its own for an
 * existing thread and extended by StartConversationRequest.
 */
class SendTemplateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:512', 'regex:/^[a-z0-9_]+$/'],
            'language' => ['required', 'string', 'max:16', 'regex:/^[a-zA-Z_]+$/'],
            'params' => ['nullable', 'array', 'max:20'],
            'params.*' => ['required', 'string', 'max:1024'],
        ];
    }
}
