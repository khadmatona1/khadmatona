<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\MaintenanceStatus;
use Illuminate\Validation\Rule;

class UpdateMaintenanceRequest extends StoreMaintenanceRequest
{
    public function rules(): array
    {
        return [
            ...array_map(fn (array $rules) => ['sometimes', ...$rules], $this->maintenanceRules()),
            'status' => ['sometimes', Rule::enum(MaintenanceStatus::class)],
        ];
    }
}
