<?php

namespace App\Modules\Rental\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingCatalogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['page' => ['nullable', 'integer', 'min:1', 'max:100000'], 'search' => ['nullable', 'string', 'max:100']];
    }
}
