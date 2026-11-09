<?php

use App\Core\Lookup\Database\Seeders\CitySeeder;
use App\Core\Lookup\Domain\Models\City;
use App\Core\Lookup\Domain\Models\District;

test('the seeded cities are returned with locale-correct names', function () {
    $this->seed(CitySeeder::class);

    $fr = $this->getJson('/api/v1/cities', ['Accept-Language' => 'fr']);
    $fr->assertOk()->assertJsonFragment(['name' => 'Marrakech']);

    $ar = $this->getJson('/api/v1/cities', ['Accept-Language' => 'ar']);
    $ar->assertOk()->assertJsonFragment(['name' => 'مراكش']);
});

test('districts can be filtered by city and default to an empty list when none are seeded', function () {
    $city = City::factory()->withName('Marrakech')->create();

    $response = $this->getJson("/api/v1/districts?city_id={$city->id}");

    $response->assertOk()->assertJsonCount(0, 'data');
});

test('districts belong to their city', function () {
    $marrakech = City::factory()->withName('Marrakech')->create();
    $rabat = City::factory()->withName('Rabat')->create();

    $gueliz = District::create(['city_id' => $marrakech->id]);
    $gueliz->setTranslation('name', 'fr', 'Guéliz');
    District::create(['city_id' => $rabat->id]);

    $response = $this->getJson("/api/v1/districts?city_id={$marrakech->id}");

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Guéliz');
});
