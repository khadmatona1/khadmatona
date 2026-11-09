<?php

namespace App\Modules\SocialPublishing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteSocialLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:2048'],
            'state' => ['required', 'string', 'max:255'],
        ];
    }
}
