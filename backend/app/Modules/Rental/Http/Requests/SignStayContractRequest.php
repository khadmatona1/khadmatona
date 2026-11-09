<?php

namespace App\Modules\Rental\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SignStayContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nationality' => ['required', 'string', 'max:100'],
            'identity_number' => ['required', 'string', 'max:100'],
            'birth_date' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'address' => ['required', 'string', 'max:500'],
            'estimated_arrival_time' => ['nullable', 'date_format:H:i'],
            'identity_document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'signature' => ['required', 'string', 'max:2000000', 'regex:/^data:image\/png;base64,/'],
            'accept_terms' => ['accepted'],
        ];
    }
}
