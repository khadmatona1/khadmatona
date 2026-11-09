<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Http\Requests\Concerns\ConvertsMoney;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCleaningRequest extends FormRequest
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
            ...$this->cleaningRules(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function cleaningRules(): array
    {
        return [
            'scheduled_for' => ['required', 'date_format:Y-m-d'],
            'cleaner_name' => ['nullable', 'string', 'max:255'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'charged_to' => ['required', Rule::enum(ChargedTo::class)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function moneyFields(): array
    {
        return ['cost'];
    }
}
