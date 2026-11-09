<?php

namespace App\Modules\SocialPublishing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SelectSocialPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['page_id' => ['required', 'string', 'max:64']];
    }
}
