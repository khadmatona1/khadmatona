<?php

namespace App\Modules\WhatsApp\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Admin-only re-assignment/linking. Foreign tables are referenced by name
 * only (`exists:leads,id`) - no import of the Lead/Contact modules
 * (PROJECT_RULES.md §3).
 */
class UpdateConversationRequest extends FormRequest
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
            'assigned_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'lead_id' => ['sometimes', 'nullable', 'integer', 'exists:leads,id'],
            'contact_id' => ['sometimes', 'nullable', 'integer', 'exists:contacts,id'],
            'ai_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
