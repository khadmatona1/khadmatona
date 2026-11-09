<?php

namespace App\Modules\CommercialLead\Http\Requests;

use App\Modules\CommercialLead\Domain\Enums\CommercialLeadStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCommercialLeadStatusRequest extends FormRequest
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
            'status' => ['required', Rule::enum(CommercialLeadStatus::class)],
        ];
    }
}
