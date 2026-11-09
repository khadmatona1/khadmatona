<?php

namespace App\Modules\Finance\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveFinancialEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('access-admin-panel');
    }

    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in(['fee', 'commission', 'expense'])],
            'label' => ['required', 'string', 'max:255'],
            // Decimal string at the boundary; no floating-point arithmetic for money.
            'amount' => ['required', 'regex:/^\d{1,10}(\.\d{1,2})?$/', 'numeric', 'min:0.01'],
            'occurred_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'paid_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:occurred_on', 'before_or_equal:today'],
            'property_id' => ['nullable', 'integer', Rule::exists('properties', 'id')->whereNull('deleted_at')],
            'commercial_id' => ['nullable', 'required_if:kind,commission', 'integer', function ($attribute, $value, $fail) {
                if (! User::role(['Commercial', 'SeniorCommercial'])->whereKey($value)->exists()) {
                    $fail(__('validation.exists', ['attribute' => $attribute]));
                }
            }],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
