<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Http\Requests\Concerns\ConvertsMoney;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreManagedPropertyRequest extends FormRequest
{
    use ConvertsMoney;

    public function authorize(): bool
    {
        if ($this->user()->hasRole('Admin')) {
            return true;
        }
        // Updates keep the existing catalog property; scoped route binding checks it.
        if ($this->route('managedProperty')) {
            return true;
        }

        return DB::table('properties')->where('id', $this->input('property_id'))
            ->where('commercial_id', $this->user()->id)->whereNull('deleted_at')->exists();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // The properties table by name only - no Property model import
            // (PROJECT_RULES.md §3). Soft-deleted listings can't be managed.
            'property_id' => ['required', 'integer', Rule::exists('properties', 'id')->whereNull('deleted_at')],
            ...$this->termsRules(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function termsRules(): array
    {
        return [
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'cleaning_fee' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'cleaning_charged_to' => ['sometimes', Rule::enum(ChargedTo::class)],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function moneyFields(): array
    {
        return ['cleaning_fee'];
    }

    protected function rateFields(): array
    {
        return ['commission_rate' => 'commission_rate_bp'];
    }
}
