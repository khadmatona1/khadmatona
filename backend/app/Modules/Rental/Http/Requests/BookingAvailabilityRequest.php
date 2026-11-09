<?php

namespace App\Modules\Rental\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

class BookingAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $today = CarbonImmutable::now((string) config('app.business_timezone'))->startOfDay();

        return [
            'check_in_date' => ['nullable', 'required_with:check_out_date', 'date_format:Y-m-d', 'after_or_equal:'.$today->toDateString(), 'before_or_equal:'.$today->addYear()->toDateString()],
            'check_out_date' => ['nullable', 'required_with:check_in_date', 'date_format:Y-m-d', 'after:check_in_date', 'before_or_equal:'.$today->addYear()->toDateString()],
        ];
    }
}
