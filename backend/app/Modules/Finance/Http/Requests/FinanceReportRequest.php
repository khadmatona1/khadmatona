<?php

namespace App\Modules\Finance\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class FinanceReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('access-admin-panel');
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'kind' => ['nullable', Rule::in(['fee', 'commission', 'expense'])],
            'property_id' => ['nullable', 'integer', 'exists:properties,id'],
            'commercial_id' => ['nullable', 'integer', 'exists:users,id'],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if (! $validator->errors()->has('from') && ! $validator->errors()->has('to')) {
                $from = CarbonImmutable::createFromFormat('!Y-m-d', $this->input('from'));
                if ($this->input('to') > $from->addYear()->toDateString()) {
                    $validator->errors()->add('to', __('validation.before_or_equal', ['attribute' => 'to', 'date' => $from->addYear()->toDateString()]));
                }
            }
        }];
    }
}
