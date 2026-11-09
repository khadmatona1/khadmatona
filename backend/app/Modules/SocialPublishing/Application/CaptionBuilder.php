<?php

namespace App\Modules\SocialPublishing\Application;

use Illuminate\Support\Str;

/**
 * Builds the French caption from real listing data. A template line whose
 * placeholder has no value is dropped entirely, so a missing fact never
 * shows up as an empty "Superficie :" line, and nothing is ever guessed.
 */
class CaptionBuilder
{
    /** Instagram's documented caption limit - also applied to Facebook for one shared caption. */
    public const MAX_LENGTH = 2200;

    public const DEFAULT_TEMPLATE = <<<'TEMPLATE'
    🏡 {headline}

    📍 Quartier : {district}
    🏠 Type : {type}
    📐 Superficie : {surface}
    🛏 Chambres : {bedrooms}
    🛁 Salles de bain : {bathrooms}
    💰 Prix : {price}

    ✨ Découvrez {type_phrase} disponible chez KHADMATONA.

    🔗 Voir les détails : {url}

    {hashtags}
    TEMPLATE;

    private const TYPES = [
        'appartement' => ['Appartement', 'cet appartement'],
        'villa' => ['Villa', 'cette villa'],
        'riad' => ['Riad', 'ce riad'],
        'maison' => ['Maison', 'cette maison'],
        'terrain' => ['Terrain', 'ce terrain'],
        'bureau' => ['Bureau', 'ce bureau'],
        'local' => ['Local commercial', 'ce local commercial'],
    ];

    /** @param  array<string, mixed>  $listing  See PropertyDirectory::socialListing() */
    public function build(array $listing, ?string $template = null): string
    {
        $template = filled($template) ? (string) $template : self::DEFAULT_TEMPLATE;
        $values = $this->values($listing);

        $lines = [];
        foreach (preg_split('/\R/u', $template) as $line) {
            preg_match_all('/\{(\w+)\}/', $line, $matches);

            $missing = array_filter($matches[1], fn (string $key) => array_key_exists($key, $values) && blank($values[$key]));
            if ($missing !== []) {
                continue;
            }

            $lines[] = strtr($line, collect($values)->mapWithKeys(fn ($value, $key) => ['{'.$key.'}' => (string) $value])->all());
        }

        $caption = trim((string) preg_replace("/\n{3,}/", "\n\n", implode("\n", $lines)));

        // Hashtags are what's expendable - the listing URL has to survive.
        if (mb_strlen($caption) > self::MAX_LENGTH) {
            $caption = trim(str_replace((string) $values['hashtags'], '', $caption));
        }

        return mb_substr($caption, 0, self::MAX_LENGTH);
    }

    /**
     * @param  array<string, mixed>  $listing
     * @return array<string, string|null>
     */
    private function values(array $listing): array
    {
        [$typeLabel, $typePhrase] = self::TYPES[$listing['type']] ?? [Str::ucfirst((string) $listing['type']), null];
        $city = $listing['city'] ?? null;
        $isRental = ($listing['transaction_type'] ?? null) === 'rent';

        return [
            'headline' => mb_strtoupper(($isRental ? 'Nouvelle location' : 'Nouveau bien').($city ? " à {$city}" : '')),
            'title' => $listing['title'] ?? null,
            'type' => $typeLabel,
            'type_phrase' => $typePhrase,
            'city' => $city,
            'district' => $listing['district'] ?? null,
            'surface' => ($listing['surface'] ?? 0) > 0 ? "{$listing['surface']} m²" : null,
            'bedrooms' => ($listing['bedrooms'] ?? 0) > 0 ? (string) $listing['bedrooms'] : null,
            'bathrooms' => ($listing['bathrooms'] ?? 0) > 0 ? (string) $listing['bathrooms'] : null,
            'price' => $this->price($listing),
            'url' => $listing['url'] ?? null,
            'hashtags' => $this->hashtags($typeLabel, $city),
        ];
    }

    /** @param  array<string, mixed>  $listing */
    private function price(array $listing): ?string
    {
        $cents = (int) ($listing['price_cents'] ?? 0);

        if ($cents <= 0) {
            return null;
        }

        $price = number_format($cents / 100, 0, ',', ' ').' DH';

        return match ($listing['price_period'] ?? null) {
            'month' => "{$price} / mois",
            'night' => "{$price} / nuit",
            default => $price,
        };
    }

    private function hashtags(string $typeLabel, ?string $city): string
    {
        $slug = fn (string $value) => Str::studly(Str::ascii($value));

        $tags = $city
            ? ['#Immobilier'.$slug($city), '#KHADMATONA', '#'.$slug($typeLabel).$slug($city), '#ImmobilierMaroc']
            : ['#KHADMATONA', '#'.$slug($typeLabel), '#ImmobilierMaroc'];

        return implode(' ', $tags);
    }
}
