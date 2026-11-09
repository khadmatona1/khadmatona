<?php

namespace App\Modules\Rental\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['Admin', 'SeniorCommercial', 'Commercial']);
    }

    public function rules(): array
    {
        return ['total_amount' => ['required', 'numeric', 'min:0.01', 'max:100000000', 'decimal:0,2']];
    }
}
