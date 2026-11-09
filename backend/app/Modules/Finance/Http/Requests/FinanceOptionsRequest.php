<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinanceOptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('access-admin-panel');
    }

    public function rules(): array
    {
        return ['search' => ['nullable', 'string', 'max:100']];
    }
}
