<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\ChargedTo;
use App\Modules\Rental\Domain\Enums\MaintenancePriority;
use App\Modules\Rental\Http\Requests\Concerns\ConvertsMoney;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceRequest extends FormRequest
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
            ...$this->maintenanceRules(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function maintenanceRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priority' => ['required', Rule::enum(MaintenancePriority::class)],
            'provider_name' => ['nullable', 'string', 'max:255'],
            'reported_on' => ['nullable', 'date_format:Y-m-d'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'charged_to' => ['required', Rule::enum(ChargedTo::class)],
        ];
    }

    protected function moneyFields(): array
    {
        return ['cost'];
    }
}
