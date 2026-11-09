<?php

use App\Core\Lookup\Domain\Models\City;
use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

test('public searches distinguish sale and rental periods without guessing legacy listings', function () {
    $sale = Property::factory()->state(['status' => 'disponible'])->create(['transaction_type' => 'sale', 'price' => 900_000_00]);
    $monthly = Property::factory()->state(['status' => 'disponible'])->create(['transaction_type' => 'rent', 'price_period' => 'month', 'price' => 5_000_00]);
    Property::factory()->state(['status' => 'disponible'])->create(['transaction_type' => 'rent', 'price_period' => 'night', 'price' => 800_00]);
    $legacy = Property::factory()->state(['status' => 'disponible'])->create();

    $this->getJson('/api/v1/properties?filter[transaction_type]=sale')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $sale->id);

    $this->getJson('/api/v1/properties?'.http_build_query([
        'filter' => ['transaction_type' => 'rent', 'price_period' => 'month', 'price_min' => 3000, 'price_max' => 7000],
    ]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $monthly->id);

    $this->getJson("/api/v1/properties/{$legacy->id}")
        ->assertOk()->assertJsonPath('data.transaction_type', null)->assertJsonPath('data.price_period', null);
});

test('the property editor persists and clears transaction metadata and validates rental units', function () {
    Role::findOrCreate('Admin');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');
    $city = City::factory()->create();
    $payload = ['title' => 'Apartment', 'type' => 'appartement', 'status' => 'disponible', 'city_id' => $city->id, 'address' => 'Gueliz', 'price' => 5000, 'surface' => 80, 'transaction_type' => 'rent', 'price_period' => 'month'];

    $created = $this->actingAs($admin)->postJson('/api/v1/properties', $payload)
        ->assertCreated()->assertJsonPath('data.transaction_type', 'rent')->assertJsonPath('data.price_period', 'month');
    $id = $created->json('data.id');

    $this->putJson("/api/v1/properties/{$id}", [...$payload, 'price_period' => null])
        ->assertUnprocessable()->assertJsonValidationErrors('price_period');
    $this->putJson("/api/v1/properties/{$id}", [...$payload, 'transaction_type' => 'sale'])
        ->assertUnprocessable()->assertJsonValidationErrors('price_period');
    $this->putJson("/api/v1/properties/{$id}", [...$payload, 'transaction_type' => null, 'price_period' => null])
        ->assertOk()->assertJsonPath('data.transaction_type', null)->assertJsonPath('data.price_period', null);
});
