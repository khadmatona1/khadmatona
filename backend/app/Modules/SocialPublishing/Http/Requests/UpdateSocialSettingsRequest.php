<?php

namespace App\Modules\SocialPublishing\Http\Requests;

use App\Modules\SocialPublishing\Domain\Enums\PublishMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSocialSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'facebook_enabled' => ['required', 'boolean'],
            'instagram_enabled' => ['required', 'boolean'],
            'default_facebook' => ['required', 'boolean'],
            'default_instagram' => ['required', 'boolean'],
            'default_mode' => ['required', Rule::enum(PublishMode::class)],
            'caption_template' => ['nullable', 'string', 'max:2000'],
            'facebook_max_images' => ['required', 'integer', 'min:1', 'max:10'],
            'instagram_max_images' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }
}
