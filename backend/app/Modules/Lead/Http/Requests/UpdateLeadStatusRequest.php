<?php

namespace App\Modules\Lead\Http\Requests;

use App\Modules\Lead\Domain\Enums\LeadStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadStatusRequest extends FormRequest
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
        $rules = [
            'status' => ['required', Rule::enum(LeadStatus::class)],
        ];

        // "À rappeler" is meaningless without knowing when: the callback time
        // is required (and must be in the future) for that status only.
        if ($this->input('status') === LeadStatus::ToCallBack->value) {
            $rules['callback_at'] = ['required', 'date', 'after:now'];
        }

        return $rules;
    }
}
