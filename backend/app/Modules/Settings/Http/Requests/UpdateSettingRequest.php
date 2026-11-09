<?php

namespace App\Modules\Settings\Http\Requests;

use App\Modules\Settings\Domain\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingRequest extends FormRequest
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
        $locales = array_filter(explode(',', (string) env('SUPPORTED_LOCALES', 'fr')));

        $rules = [
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_whatsapp' => ['nullable', 'string', 'max:50'],

            'social_facebook' => ['nullable', 'url', 'max:255'],
            'social_instagram' => ['nullable', 'url', 'max:255'],
            'social_linkedin' => ['nullable', 'url', 'max:255'],
            'social_whatsapp' => ['nullable', 'url', 'max:255'],

            'translations' => ['sometimes', 'array'],
        ];

        foreach ($locales as $locale) {
            $rules["translations.{$locale}"] = ['sometimes', 'array'];

            foreach (Setting::TRANSLATABLE_FIELDS as $field) {
                $rules["translations.{$locale}.{$field}"] = ['sometimes', 'nullable', 'string'];
            }
        }

        return $rules;
    }
}
