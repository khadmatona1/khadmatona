<?php

use App\Core\Lookup\Database\Seeders\CitySeeder;

test('a request with no Accept-Language header falls back to the configured fallback locale, not the first supported one', function () {
    // SUPPORTED_LOCALES=ar,fr,en but APP_FALLBACK_LOCALE=fr - a guest
    // sending no header (every SSR request from the frontend, and most
    // plain HTTP clients) must resolve to fr, not silently default to
    // whichever locale happens to be listed first.
    $this->seed(CitySeeder::class);

    $response = $this->getJson('/api/v1/cities');

    $response->assertOk()->assertJsonFragment(['name' => 'Marrakech']);
});

test('an explicit Accept-Language header is still honored', function () {
    $this->seed(CitySeeder::class);

    $response = $this->getJson('/api/v1/cities', ['Accept-Language' => 'ar']);

    $response->assertOk()->assertJsonFragment(['name' => 'مراكش']);
});
