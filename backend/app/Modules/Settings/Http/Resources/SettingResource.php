<?php

namespace App\Modules\Settings\Http\Resources;

use App\Modules\Settings\Domain\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public shape - flat, resolved to the current request's locale (already
 * set by the SetLocale middleware), same pattern as CityResource. Consumed
 * directly by the public site (homepage hero/stats, footer, contact page).
 *
 * @mixin Setting
 */
class SettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            'contact_whatsapp' => $this->contact_whatsapp,
            'address' => $this->translate('address'),
            'business_hours_weekdays' => $this->translate('business_hours_weekdays'),
            'business_hours_saturday' => $this->translate('business_hours_saturday'),

            'social_facebook' => $this->social_facebook,
            'social_instagram' => $this->social_instagram,
            'social_linkedin' => $this->social_linkedin,
            'social_whatsapp' => $this->social_whatsapp,

            'hero_eyebrow' => $this->translate('hero_eyebrow'),
            'hero_title_before' => $this->translate('hero_title_before'),
            'hero_title_accent' => $this->translate('hero_title_accent'),
            'hero_title_after' => $this->translate('hero_title_after'),
            'hero_subtitle' => $this->translate('hero_subtitle'),
            'hero_clients_count' => $this->translate('hero_clients_count'),

            'stat1_value' => $this->translate('stat1_value'),
            'stat1_label' => $this->translate('stat1_label'),
            'stat2_value' => $this->translate('stat2_value'),
            'stat2_label' => $this->translate('stat2_label'),
            'stat3_value' => $this->translate('stat3_value'),
            'stat3_label' => $this->translate('stat3_label'),
            'stat4_value' => $this->translate('stat4_value'),
            'stat4_label' => $this->translate('stat4_label'),

            'cta_stat1_value' => $this->translate('cta_stat1_value'),
            'cta_stat1_label' => $this->translate('cta_stat1_label'),
            'cta_stat2_value' => $this->translate('cta_stat2_value'),
            'cta_stat2_label' => $this->translate('cta_stat2_label'),
            'cta_stat3_value' => $this->translate('cta_stat3_value'),
            'cta_stat3_label' => $this->translate('cta_stat3_label'),
            'cta_stat4_value' => $this->translate('cta_stat4_value'),
            'cta_stat4_label' => $this->translate('cta_stat4_label'),
        ];
    }
}
