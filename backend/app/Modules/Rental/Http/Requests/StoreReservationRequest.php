<?php

namespace App\Modules\Rental\Http\Requests;

use App\Modules\Rental\Domain\Enums\ReservationChannel;
use App\Modules\Rental\Http\Requests\Concerns\ConvertsMoney;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shape only. Business rules (active management, overlaps, fee <= total)
 * live in ReservationService.
 */
class StoreReservationRequest extends FormRequest
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
            ...$this->stayRules(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function stayRules(): array
    {
        return [
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]+$/'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guests_count' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'channel' => ['required', Rule::enum(ReservationChannel::class)],
            'check_in_date' => ['required', 'date_format:Y-m-d'],
            'check_out_date' => ['required', 'date_format:Y-m-d', 'after:check_in_date'],
            'total_amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'platform_fee' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function moneyFields(): array
    {
        return ['total_amount', 'platform_fee'];
    }
}
