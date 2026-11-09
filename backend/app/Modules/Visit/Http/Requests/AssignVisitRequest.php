<?php

namespace App\Modules\Visit\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignVisitRequest extends FormRequest
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
            'commercial_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
