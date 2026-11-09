<?php

namespace App\Modules\Rental\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Check-in / check-out: an optional note (key handover, meter readings,
 * damages seen...).
 */
class ReservationStepRequest extends FormRequest
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
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
