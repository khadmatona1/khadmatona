<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\CleaningStatus;
use Illuminate\Validation\Rule;

class UpdateCleaningRequest extends StoreCleaningRequest
{
    public function rules(): array
    {
        return [
            ...array_map(fn (array $rules) => ['sometimes', ...$rules], $this->cleaningRules()),
            'status' => ['sometimes', Rule::enum(CleaningStatus::class)],
        ];
    }
}
