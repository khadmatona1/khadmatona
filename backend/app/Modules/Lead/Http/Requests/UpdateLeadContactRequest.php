<?php

namespace App\Modules\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `Rule::exists('contacts', 'id')` references the table by name only - no
 * `App\Modules\Contact\Domain\Models\Contact` import, keeping this inside
 * PROJECT_RULES.md §3's "business modules never import another business
 * module's class" rule.
 */
class UpdateLeadContactRequest extends FormRequest
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
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
        ];
    }
}
