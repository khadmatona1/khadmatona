<?php

namespace App\Modules\Rental\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class RentalStatementRequest extends FormRequest
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
            'month' => ['nullable', 'date_format:Y-m'],
        ];
    }

    /** The requested month, defaulting to the current one (business timezone). */
    public function month(): string
    {
        return $this->validated('month') ?? Carbon::now((string) config('app.business_timezone'))->format('Y-m');
    }
}
