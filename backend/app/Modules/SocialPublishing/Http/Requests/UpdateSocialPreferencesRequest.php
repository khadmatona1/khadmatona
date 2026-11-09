<?php

namespace App\Modules\SocialPublishing\Http\Requests;

use App\Modules\SocialPublishing\Domain\Enums\PublishMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSocialPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'facebook' => ['required', 'boolean'],
            'instagram' => ['required', 'boolean'],
            'mode' => ['required', Rule::enum(PublishMode::class)],
        ];
    }
}
