<?php

namespace App\Modules\SocialPublishing\Http\Requests;

use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublishPropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'platforms' => ['required', 'array', 'min:1'],
            'platforms.*' => ['distinct', Rule::enum(SocialPlatform::class)],
        ];
    }

    /** @return array<int, SocialPlatform> */
    public function platforms(): array
    {
        return array_map(SocialPlatform::from(...), $this->validated('platforms'));
    }
}
