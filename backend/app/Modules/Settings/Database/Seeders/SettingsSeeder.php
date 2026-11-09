<?php

namespace App\Modules\Settings\Database\Seeders;

use App\Modules\Settings\Domain\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * Seeds the single settings row with the exact values that were previously
 * hardcoded (messages/*.json + literal tel:/mailto: links in site-footer.tsx
 * and contact/page.tsx), so switching those pages over to read from this
 * module doesn't change anything the site currently shows - it just makes
 * it editable going forward.
 */
class SettingsSeeder extends Seeder
{
    private const TRANSLATIONS = [
        'address' => [
            'fr' => 'Avenue Mohammed VI, Marrakech, Maroc',
            'en' => 'Avenue Mohammed VI, Marrakech, Morocco',
            'ar' => 'شارع محمد السادس، مراكش، المغرب',
        ],
        'business_hours_weekdays' => [
            'fr' => 'Lundi – Vendredi : 9h – 18h',
            'en' => 'Monday – Friday: 9am – 6pm',
            'ar' => 'الاثنين – الجمعة: 9 صباحًا – 6 مساءً',
        ],
        'business_hours_saturday' => [
            'fr' => 'Samedi : 9h – 13h',
            'en' => 'Saturday: 9am – 1pm',
            'ar' => 'السبت: 9 صباحًا – 1 ظهرًا',
        ],
        'hero_eyebrow' => [
            'fr' => 'Marrakech · Immobilier premium',
            'en' => 'Marrakech · Premium real estate',
            'ar' => 'مراكش · عقارات فاخرة',
        ],
        'hero_title_before' => [
            'fr' => 'Trouvez le',
            'en' => 'Find the',
            'ar' => 'اعثر على',
        ],
        'hero_title_accent' => [
            'fr' => 'bien',
            'en' => 'property',
            'ar' => 'العقار',
        ],
        'hero_title_after' => [
            'fr' => 'qui vous ressemble',
            'en' => 'that fits you',
            'ar' => 'الذي يناسبك',
        ],
        'hero_subtitle' => [
            'fr' => "KHADMATONA Group sélectionne et présente des biens d'exception à Marrakech — villas, riads, appartements — et vous accompagne dans chaque visite, vente ou location.",
            'en' => 'KHADMATONA Group selects and showcases exceptional properties in Marrakech — villas, riads, apartments — and guides you through every visit, sale or rental.',
            'ar' => 'تختار مجموعة خدماتنا وتعرض عقارات استثنائية في مراكش فيلات، رياضات، شقق — وترافقكم في كل زيارة أو بيع أو كراء.',
        ],
        // Feeds only the Hero's own social-proof badge (avatars + "N
        // clients" + stars) - independent from stat1-4 below, which feed
        // the separate stats grid further down the page.
        'hero_clients_count' => ['fr' => '+120', 'en' => '+120', 'ar' => '+120'],
        'stat1_value' => ['fr' => '20+', 'en' => '20+', 'ar' => '+20'],
        'stat1_label' => [
            'fr' => 'Biens en vitrine',
            'en' => 'Showcased properties',
            'ar' => 'عقار في الواجهة',
        ],
        'stat2_value' => ['fr' => '48h', 'en' => '48h', 'ar' => '48 س'],
        'stat2_label' => [
            'fr' => 'Délai moyen de réponse',
            'en' => 'Average response time',
            'ar' => 'متوسط زمن الاستجابة',
        ],
        'stat3_value' => ['fr' => '100%', 'en' => '100%', 'ar' => '100%'],
        'stat3_label' => [
            'fr' => 'Biens vérifiés',
            'en' => 'Verified properties',
            'ar' => 'عقارات موثوقة',
        ],
        'stat4_value' => ['fr' => '1', 'en' => '1', 'ar' => '1'],
        'stat4_label' => [
            'fr' => 'Ville, Marrakech, pour commencer',
            'en' => 'City, Marrakech, to start with',
            'ar' => 'مدينة، مراكش، للبداية',
        ],
        // Footer "Nous contacter" CTA band's own 4 stat cards - exact
        // values that were previously hardcoded per-locale in
        // messages/*.json (Footer.stat*), including the fr/ar "1h" vs. en
        // "48h" drift that already existed there.
        'cta_stat1_value' => ['fr' => '+20', 'en' => '+20', 'ar' => '+20'],
        'cta_stat1_label' => [
            'fr' => 'Biens en vitrine',
            'en' => 'Showcased properties',
            'ar' => 'عقار معروض',
        ],
        'cta_stat2_value' => ['fr' => '1h', 'en' => '48h', 'ar' => '1h'],
        'cta_stat2_label' => [
            'fr' => 'Délai moyen de réponse',
            'en' => 'Average response time',
            'ar' => 'متوسط زمن الرد',
        ],
        'cta_stat3_value' => ['fr' => '100%', 'en' => '100%', 'ar' => '100%'],
        'cta_stat3_label' => [
            'fr' => 'Biens vérifiés',
            'en' => 'Verified properties',
            'ar' => 'عقار موثق',
        ],
        'cta_stat4_value' => ['fr' => '1', 'en' => '1', 'ar' => '1'],
        'cta_stat4_label' => [
            'fr' => 'Ville : Marrakech',
            'en' => 'City: Marrakech',
            'ar' => 'المدينة: مراكش',
        ],
    ];

    /**
     * Idempotent by design: `entrypoint.sh` runs `db:seed --force` on every
     * container start, not just on first install, so this can never
     * overwrite a value that already exists.
     *
     * The plain columns below (contact_phone, social links, ...) are
     * `nullable()` - "never set" and "an admin intentionally cleared it"
     * are both just `NULL` there, with no way to tell them apart column by
     * column (Laravel's ConvertEmptyStringsToNull middleware turns a
     * cleared field's submitted "" into that same `NULL` before it's even
     * saved). So this doesn't ask "is this column empty?" - it asks the
     * question the schema can actually answer unambiguously: "does the
     * settings row exist yet at all?" Setting is a genuine singleton (see
     * Setting::current()) - the row either already exists, in which case
     * every plain column is the admin's to manage from then on and this
     * seeder leaves all of them alone, or it doesn't, in which case this
     * is truly a fresh install and every default gets filled in once.
     *
     * Translations are a separate, per-field/locale question (does a row
     * exist for *this* field+locale) and are handled independently below -
     * that's what lets a newly-added translatable field (e.g.
     * hero_clients_count) get seeded onto an *existing* install without
     * this row-level fresh-install check having any bearing on it.
     */
    public function run(): void
    {
        $isFreshInstall = Setting::query()->doesntExist();
        $setting = Setting::current();

        if ($isFreshInstall) {
            $setting->update([
                'contact_phone' => '+212 5 00 00 00 00',
                'contact_email' => 'contact@khadmatona.ma',
                'contact_whatsapp' => null,
                // Placeholder handles, matching what site-footer.tsx already
                // hardcoded - swap for the real accounts once they exist.
                'social_facebook' => 'https://facebook.com/khadmatona',
                'social_instagram' => 'https://instagram.com/khadmatona',
                'social_linkedin' => 'https://linkedin.com/company/khadmatona',
                'social_whatsapp' => 'https://wa.me/212600000000',
            ]);
        }

        foreach (self::TRANSLATIONS as $field => $locales) {
            foreach ($locales as $locale => $value) {
                if ($setting->translate($field, $locale) === null) {
                    $setting->setTranslation($field, $locale, $value);
                }
            }
        }

        // Setting::current() caches forever - without this, a request
        // served right after a deploy could still see a pre-seed snapshot
        // if anything had already populated the cache this process.
        Cache::forget(Setting::CACHE_KEY);
    }
}
