<?php

namespace App\Modules\Rental\Http\Requests;

class StoreBookingRequest extends BookingAvailabilityRequest
{
    public function rules(): array
    {
        $dates = parent::rules();

        return [
            'property_id' => ['required', 'integer', 'min:1'],
            'request_key' => ['required', 'uuid'],
            'check_in_date' => ['required', ...array_filter($dates['check_in_date'], fn ($rule) => $rule !== 'nullable')],
            'check_out_date' => ['required', ...array_filter($dates['check_out_date'], fn ($rule) => $rule !== 'nullable')],
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9\s().-]+$/', function ($attribute, $value, $fail) {
                $length = strlen((string) preg_replace('/\D/', '', $value));
                if ($length < 8 || $length > 15) {
                    $fail(__('booking.phone_invalid'));
                }
            }],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guests_count' => ['required', 'integer', 'min:1', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'consent' => ['required', 'accepted'],
            'website' => ['nullable', 'string', 'max:0'],
        ];
    }
}
