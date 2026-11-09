<?php

use App\Core\Lookup\Domain\Models\City;
use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial', 'Owner'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('Commercial');
    $this->senior = User::factory()->create();
    $this->senior->assignRole('SeniorCommercial');
    $this->city = City::factory()->withName('Marrakech')->create();

    $this->payload = fn (array $overrides = []) => array_merge([
        'title' => 'Villa Palmeraie',
        'type' => 'villa',
        'status' => 'disponible',
        'city_id' => $this->city->id,
        'address' => 'Route de Fès',
        'price' => 2_500_000,
        'surface' => 400,
    ], $overrides);
});

test('an admin can create a property without assigning a commercial', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/properties', ($this->payload)())
        ->assertStatus(201)
        ->assertJsonPath('data.commercial_id', null);
});

test('an admin can assign a new property to a commercial or a senior commercial', function (string $who) {
    $assignee = $this->{$who};

    $this->actingAs($this->admin)->postJson('/api/v1/properties', ($this->payload)(['commercial_id' => $assignee->id]))
        ->assertStatus(201)
        ->assertJsonPath('data.commercial_id', $assignee->id)
        ->assertJsonPath('data.commercial_name', $assignee->name);
})->with(['commercial', 'senior']);

test('an admin can reassign and unassign an existing property', function () {
    $property = Property::factory()->create(['commercial_id' => $this->commercial->id, 'city_id' => $this->city->id]);

    $this->actingAs($this->admin)->putJson("/api/v1/properties/{$property->id}", ($this->payload)(['commercial_id' => $this->senior->id]))
        ->assertOk()->assertJsonPath('data.commercial_id', $this->senior->id);

    // The dashboard form posts multipart data, where "no commercial" is an empty string.
    $this->actingAs($this->admin)->post("/api/v1/properties/{$property->id}", ($this->payload)(['commercial_id' => '', '_method' => 'PUT']), ['Accept' => 'application/json'])
        ->assertOk()->assertJsonPath('data.commercial_id', null);
});

test('omitting commercial_id on update keeps the current assignment', function () {
    $property = Property::factory()->create(['commercial_id' => $this->commercial->id, 'city_id' => $this->city->id]);

    $this->actingAs($this->admin)->putJson("/api/v1/properties/{$property->id}", ($this->payload)())
        ->assertOk()->assertJsonPath('data.commercial_id', $this->commercial->id);
});

test('only active commercial accounts can be assigned', function (string $case) {
    $target = match ($case) {
        'admin' => $this->admin,
        'owner' => tap(User::factory()->create())->assignRole('Owner'),
        'no role' => User::factory()->create(),
        'inactive commercial' => tap(User::factory()->create(['is_active' => false]))->assignRole('Commercial'),
    };

    $this->actingAs($this->admin)->postJson('/api/v1/properties', ($this->payload)(['commercial_id' => $target->id]))
        ->assertStatus(422)->assertJsonValidationErrors('commercial_id');
})->with(['admin', 'owner', 'no role', 'inactive commercial']);

test('saving a property whose commercial was since deactivated keeps working', function () {
    $property = Property::factory()->create(['commercial_id' => $this->commercial->id, 'city_id' => $this->city->id]);
    $this->commercial->update(['is_active' => false]);

    $this->actingAs($this->admin)->putJson("/api/v1/properties/{$property->id}", ($this->payload)(['commercial_id' => $this->commercial->id, 'title' => 'Nouveau titre']))
        ->assertOk()->assertJsonPath('data.title', 'Nouveau titre');
});

test('a commercial cannot assign their property to someone else', function () {
    $this->actingAs($this->commercial)->postJson('/api/v1/properties', ($this->payload)(['commercial_id' => $this->senior->id]))
        ->assertStatus(201)
        ->assertJsonPath('data.commercial_id', $this->commercial->id);
});

test('an assigned commercial sees the property in their dashboard list', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/properties', ($this->payload)(['commercial_id' => $this->commercial->id]))->assertStatus(201);

    $this->actingAs($this->commercial)->getJson('/api/v1/dashboard/properties')
        ->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($this->senior)->getJson('/api/v1/dashboard/properties')
        ->assertOk()->assertJsonCount(0, 'data');
});

test('the users list returns every assignable commercial for the property form picker', function () {
    // Same query the dashboard's property form sends.
    $response = $this->actingAs($this->admin)->getJson('/api/v1/users?filter[role]=Commercial%2CSeniorCommercial&per_page=200')
        ->assertOk();

    expect(collect($response->json('data'))->pluck('id')->sort()->values()->all())
        ->toBe(collect([$this->commercial->id, $this->senior->id])->sort()->values()->all());
});

test('the users role filter still works for one role and ignores unknown roles', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/users?filter[role]=SeniorCommercial')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->senior->id);

    $this->actingAs($this->admin)->getJson('/api/v1/users?filter[role]=NotARole')
        ->assertOk()->assertJsonCount(0, 'data');
});
