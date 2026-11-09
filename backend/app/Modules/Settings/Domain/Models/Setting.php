<?php

namespace App\Modules\Settings\Domain\Models;

use App\Core\Localization\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use HasTranslations;

    /**
     * Single source of truth for which fields live in the translations
     * table rather than as a plain column - shared by SettingEditResource
     * (building the admin per-locale payload) and UpdateSettingRequest
     * (validating it).
     */
    public const TRANSLATABLE_FIELDS = [
        'address',
        'business_hours_weekdays',
        'business_hours_saturday',
        'hero_eyebrow',
        'hero_title_before',
        'hero_title_accent',
        'hero_title_after',
        'hero_subtitle',
        // Deliberately separate from stat1-4 below - it only feeds the
        // Hero's small social-proof badge (avatars + "N clients" + stars),
        // not the stats grid further down the page. The two used to share
        // stat2_value, which meant editing one always changed the other;
        // this field exists so they can hold independent numbers.
        'hero_clients_count',
        // Stat *values* are translatable too, not just their labels - the
        // Arabic figures use different digit/unit conventions than French/
        // English (e.g. "20+" vs "+20", "48h" vs "48 س"), not just a
        // translated label next to the same literal value.
        'stat1_value',
        'stat1_label',
        'stat2_value',
        'stat2_label',
        'stat3_value',
        'stat3_label',
        'stat4_value',
        'stat4_label',
        // Feeds only the footer's "Nous contacter" CTA band's own 4 stat
        // cards (showcase volume, response time, verification rate, city
        // coverage) - previously hardcoded per-locale strings in
        // messages/*.json (Footer.stat*), which is what let the French/
        // Arabic and English copies drift out of sync with each other.
        // Distinct from stat1-4 above, which feed the homepage's own
        // separate "Trust band" stats grid.
        'cta_stat1_value',
        'cta_stat1_label',
        'cta_stat2_value',
        'cta_stat2_label',
        'cta_stat3_value',
        'cta_stat3_label',
        'cta_stat4_value',
        'cta_stat4_label',
    ];

    protected $fillable = [
        'contact_phone',
        'contact_email',
        'contact_whatsapp',
        'social_facebook',
        'social_instagram',
        'social_linkedin',
        'social_whatsapp',
    ];

    /** Cache key used here and by EloquentSettingRepository::updateCurrent()'s invalidation. */
    public const CACHE_KEY = 'settings.current';

    /**
     * There is always exactly one settings row - callers never look it up
     * by id, they just want "the" settings. Read on nearly every public
     * page load (site-wide contact info, social links, homepage hero
     * text/stats), so it's cached - see updateCurrent() for invalidation.
     */
    public static function current(): self
    {
        return Cache::rememberForever(
            self::CACHE_KEY,
            fn () => static::query()->with('translations')->first() ?? static::create(),
        );
    }
}
