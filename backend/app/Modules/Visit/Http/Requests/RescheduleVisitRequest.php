<?php

namespace App\Modules\Visit\Http\Requests;

use App\Modules\Visit\Http\Rules\WithinBusinessHours;
use Illuminate\Foundation\Http\FormRequest;

class RescheduleVisitRequest extends FormRequest
{
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
            'scheduled_at' => ['required', 'date', 'after:now', new WithinBusinessHours],
        ];
    }
}
