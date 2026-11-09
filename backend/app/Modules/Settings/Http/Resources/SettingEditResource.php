<?php

namespace App\Modules\Settings\Http\Resources;

use App\Modules\Settings\Domain\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin shape - same plain columns as SettingResource, but every
 * translatable field is a {locale: value} map instead of a single
 * locale-resolved string, so the dashboard's locale-tabbed form can
 * populate all three languages at once.
 *
 * @mixin Setting
 */
class SettingEditResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $locales = array_filter(explode(',', (string) env('SUPPORTED_LOCALES', 'fr')));

        $translations = [];
        foreach (Setting::TRANSLATABLE_FIELDS as $field) {
            foreach ($locales as $locale) {
                $translations[$field][$locale] = $this->translate($field, $locale);
            }
        }

        return [
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            'contact_whatsapp' => $this->contact_whatsapp,

            'social_facebook' => $this->social_facebook,
            'social_instagram' => $this->social_instagram,
            'social_linkedin' => $this->social_linkedin,
            'social_whatsapp' => $this->social_whatsapp,

            'translations' => $translations,
        ];
    }
}
