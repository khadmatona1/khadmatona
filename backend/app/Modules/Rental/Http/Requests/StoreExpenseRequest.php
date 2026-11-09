<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Domain\Enums\ExpenseCategory;
use App\Modules\Rental\Http\Requests\Concerns\ConvertsMoney;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    use ConvertsMoney;

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
            'rental_property_id' => ['required', 'integer', Rule::exists('rental_properties', 'id')->whereNull('deleted_at')],
            ...$this->expenseRules(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function expenseRules(): array
    {
        return [
            'category' => ['required', Rule::enum(ExpenseCategory::class)],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:100000000'],
            'incurred_on' => ['required', 'date_format:Y-m-d'],
            'charged_to' => ['required', Rule::enum(ChargedTo::class)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function moneyFields(): array
    {
        return ['amount'];
    }
}
