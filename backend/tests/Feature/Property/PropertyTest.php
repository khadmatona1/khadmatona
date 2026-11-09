<?php

use App\Core\Lookup\Domain\Models\City;
use App\Core\Lookup\Domain\Models\District;
use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    $this->user = User::factory()->create();
    $this->user->assignRole('Admin');
    $this->marrakech = City::factory()->withName('Marrakech')->create();
    $this->rabat = City::factory()->withName('Rabat')->create();
});

test('a guest can list properties', function () {
    Property::factory()->state(['status' => 'disponible'])->count(3)->create();

    $response = $this->getJson('/api/v1/properties');

    $response->assertOk()->assertJsonCount(3, 'data');
});

test('a guest can view a single property', function () {
    $property = Property::factory()->state(['status' => 'disponible'])->create();

    $response = $this->getJson("/api/v1/properties/{$property->id}");

    $response->assertOk()->assertJsonPath('data.id', $property->id);
});

test('a guest cannot create, update, or delete a property', function () {
    $property = Property::factory()->state(['status' => 'disponible'])->create();

    $this->postJson('/api/v1/properties', [])->assertStatus(401);
    $this->putJson("/api/v1/properties/{$property->id}", [])->assertStatus(401);
    $this->deleteJson("/api/v1/properties/{$property->id}")->assertStatus(401);
});

test('the property list is paginated', function () {
    Property::factory()->state(['status' => 'disponible'])->count(20)->create();

    $response = $this->getJson('/api/v1/properties?per_page=5');

    $response->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.pagination.total', 20);
});

test('properties can be filtered by price range', function () {
    Property::factory()->state(['status' => 'disponible'])->create(['title' => 'Bien abordable', 'price' => 20_000_000]); // 200 000 MAD
    Property::factory()->state(['status' => 'disponible'])->create(['title' => 'Bien de luxe', 'price' => 500_000_000]); // 5 000 000 MAD

    $response = $this->getJson('/api/v1/properties?'.http_build_query([
        'filter' => ['price_min' => 100_000, 'price_max' => 1_000_000],
    ]));

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Bien abordable');
});

test('properties can be filtered by surface range', function () {
    Property::factory()->state(['status' => 'disponible'])->create(['title' => 'Petit studio', 'surface' => 30]);
    Property::factory()->state(['status' => 'disponible'])->create(['title' => 'Grande villa', 'surface' => 300]);

    $response = $this->getJson('/api/v1/properties?'.http_build_query([
        'filter' => ['surface_min' => 100, 'surface_max' => 500],
    ]));

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Grande villa');
});

test('properties can be filtered by an exact district', function () {
    $district = District::create(['city_id' => $this->rabat->id]);
    Property::factory()->state(['status' => 'disponible'])->create(['city_id' => $this->rabat->id, 'district_id' => $district->id]);
    Property::factory()->state(['status' => 'disponible'])->create(['city_id' => $this->rabat->id, 'district_id' => null]);

    $response = $this->getJson("/api/v1/properties?filter[district_id]={$district->id}");

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.district_id', $district->id);
});

test('the public property search still requires no auth and no contact info', function () {
    Property::factory()->state(['status' => 'disponible'])->count(2)->create();

    $this->getJson('/api/v1/properties')->assertOk()->assertJsonCount(2, 'data');
});

test('properties can be searched by title', function () {
    Property::factory()->state(['status' => 'disponible'])->create(['title' => 'Villa unique à Essaouira']);
    Property::factory()->state(['status' => 'disponible'])->create(['title' => 'Appartement à Rabat']);

    $response = $this->getJson('/api/v1/properties?filter[search]=Essaouira');

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('properties can be filtered by an exact city', function () {
    Property::factory()->state(['status' => 'disponible'])->create(['city_id' => $this->rabat->id]);
    Property::factory()->state(['status' => 'disponible'])->create(['city_id' => $this->marrakech->id]);

    $response = $this->getJson("/api/v1/properties?filter[city_id]={$this->rabat->id}");

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.city_id', $this->rabat->id);
});

test('an authenticated user can create a property', function () {
    $payload = [
        'title' => 'Villa avec piscine à Marrakech',
        'type' => 'villa',
        'status' => 'disponible',
        'city_id' => $this->marrakech->id,
        'address' => 'Route de l\'Ourika',
        'price' => 3_500_000,
        'surface' => 320,
        'bedrooms' => 4,
        'bathrooms' => 3,
        'description' => 'Une magnifique villa.',
    ];

    $response = $this->actingAs($this->user)->postJson('/api/v1/properties', $payload);

    $response->assertCreated()
        ->assertJsonPath('data.title', $payload['title'])
        ->assertJsonPath('data.price', 3_500_000)
        ->assertJsonPath('data.city_id', $this->marrakech->id)
        ->assertJsonPath('data.city_name', 'Marrakech');

    $this->assertDatabaseHas('properties', [
        'title' => $payload['title'],
        'price' => 350_000_000, // stored as cents
        'city_id' => $this->marrakech->id,
    ]);
});

test('creating a property requires the mandatory fields', function () {
    $response = $this->actingAs($this->user)->postJson('/api/v1/properties', []);

    $response->assertStatus(422)->assertJsonValidationErrors(['title', 'type', 'city_id', 'address', 'price', 'surface']);
});

test('creating a property rejects an unknown city_id', function () {
    $response = $this->actingAs($this->user)->postJson('/api/v1/properties', [
        'title' => 'Test',
        'type' => 'villa',
        'city_id' => 999_999,
        'address' => 'Test',
        'price' => 1_000_000,
        'surface' => 100,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['city_id']);
});

test('an authenticated user can view a single property', function () {
    $property = Property::factory()->state(['status' => 'disponible'])->create();

    $response = $this->actingAs($this->user)->getJson("/api/v1/properties/{$property->id}");

    $response->assertOk()->assertJsonPath('data.id', $property->id);
});

test('an authenticated user can update a property', function () {
    $property = Property::factory()->state(['status' => 'disponible'])->create(['status' => 'disponible']);

    $response = $this->actingAs($this->user)->putJson("/api/v1/properties/{$property->id}", [
        'title' => $property->title,
        'type' => $property->type->value,
        'status' => 'vendu',
        'city_id' => $property->city_id,
        'address' => $property->address,
        'price' => 1_000_000,
        'surface' => $property->surface,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'vendu');
    $this->assertDatabaseHas('properties', ['id' => $property->id, 'status' => 'vendu']);
});

test('an authenticated user can delete a property', function () {
    $property = Property::factory()->state(['status' => 'disponible'])->create();

    $response = $this->actingAs($this->user)->deleteJson("/api/v1/properties/{$property->id}");

    $response->assertOk();
    $this->assertSoftDeleted('properties', ['id' => $property->id]);
});

test('an authenticated user without the Admin role cannot manage properties', function () {
    $property = Property::factory()->state(['status' => 'disponible'])->create();
    $nonAdmin = User::factory()->create();

    $this->actingAs($nonAdmin)->postJson('/api/v1/properties', [])->assertStatus(403);
    $this->actingAs($nonAdmin)->putJson("/api/v1/properties/{$property->id}", [])->assertStatus(403);
    $this->actingAs($nonAdmin)->deleteJson("/api/v1/properties/{$property->id}")->assertStatus(403);
});
