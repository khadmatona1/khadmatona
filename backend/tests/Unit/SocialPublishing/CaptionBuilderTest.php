<?php

use App\Modules\SocialPublishing\Application\CaptionBuilder;

function listing(array $overrides = []): array
{
    return [
        'title' => 'Bel appartement', 'type' => 'appartement', 'transaction_type' => 'sale', 'price_period' => null,
        'city' => 'Marrakech', 'district' => 'Guéliz', 'price_cents' => 125_000_000, 'surface' => 95,
        'bedrooms' => 2, 'bathrooms' => 1, 'url' => 'https://khadmatona.test/properties/1',
        'image_urls' => [], 'created_at' => '2026-10-30T00:00:00+00:00', ...$overrides,
    ];
}

test('builds the French caption from real data', function () {
    $caption = (new CaptionBuilder)->build(listing());

    expect($caption)
        ->toContain('🏡 NOUVEAU BIEN À MARRAKECH')
        ->toContain('📍 Quartier : Guéliz')
        ->toContain('🏠 Type : Appartement')
        ->toContain('📐 Superficie : 95 m²')
        ->toContain('🛏 Chambres : 2')
        ->toContain('💰 Prix : 1 250 000 DH')
        ->toContain('Découvrez cet appartement disponible chez KHADMATONA')
        ->toContain('🔗 Voir les détails : https://khadmatona.test/properties/1')
        ->toContain('#ImmobilierMarrakech #KHADMATONA #AppartementMarrakech #ImmobilierMaroc');
});

test('missing details drop their whole line and are never invented', function () {
    $caption = (new CaptionBuilder)->build(listing(['district' => null, 'surface' => 0, 'bedrooms' => 0, 'bathrooms' => 0, 'price_cents' => 0]));

    expect($caption)
        ->not->toContain('Quartier')
        ->not->toContain('Superficie')
        ->not->toContain('Chambres')
        ->not->toContain('Salles de bain')
        ->not->toContain('Prix');
});

test('rentals state the period', function () {
    $caption = (new CaptionBuilder)->build(listing(['transaction_type' => 'rent', 'price_period' => 'month', 'price_cents' => 800_000]));

    expect($caption)->toContain('NOUVELLE LOCATION À MARRAKECH')->toContain('8 000 DH / mois');
});

test('accents and spaces are removed from hashtags', function () {
    $caption = (new CaptionBuilder)->build(listing(['city' => 'Fès', 'type' => 'local']));

    expect($caption)->toContain('#ImmobilierFes')->toContain('#LocalCommercialFes');
});

test('a custom template is honoured and unknown placeholders stay untouched', function () {
    $caption = (new CaptionBuilder)->build(listing(['district' => null]), "{title}\n{district}\n{url} {nope}");

    expect($caption)->toBe("Bel appartement\nhttps://khadmatona.test/properties/1 {nope}");
});

test('an oversized caption stays within the limit and keeps the listing URL', function () {
    $caption = (new CaptionBuilder)->build(listing(), str_repeat('x', 2185)."\n{url}\n{hashtags}");

    expect(mb_strlen($caption))->toBeLessThanOrEqual(CaptionBuilder::MAX_LENGTH);
});
