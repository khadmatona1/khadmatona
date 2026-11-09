<?php

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Owner');

    $this->contactA = Contact::factory()->create(['type' => 'landlord']);
    $this->ownerA = User::factory()->create(['contact_id' => $this->contactA->id]);
    $this->ownerA->assignRole('Owner');
    $this->propertyA = Property::factory()->create(['owner_contact_id' => $this->contactA->id]);

    $this->contactB = Contact::factory()->create(['type' => 'seller']);
    $this->ownerB = User::factory()->create(['contact_id' => $this->contactB->id]);
    $this->ownerB->assignRole('Owner');
    $this->propertyB = Property::factory()->create(['owner_contact_id' => $this->contactB->id]);
});

test('a guest cannot reach any owner portal route', function () {
    $this->getJson('/api/v1/owner/properties')->assertStatus(401);
    $this->getJson("/api/v1/owner/properties/{$this->propertyA->id}")->assertStatus(401);
    $this->getJson('/api/v1/owner/reports/monthly')->assertStatus(401);
});

test('a non-owner authenticated user cannot reach the owner portal', function () {
    $plainUser = User::factory()->create();

    $this->actingAs($plainUser)->getJson('/api/v1/owner/properties')->assertStatus(403);
});

test('an owner sees only their own properties in the list', function () {
    $response = $this->actingAs($this->ownerA)->getJson('/api/v1/owner/properties');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->propertyA->id);
});

test('an owner can view their own property', function () {
    $response = $this->actingAs($this->ownerA)->getJson("/api/v1/owner/properties/{$this->propertyA->id}");

    $response->assertOk()->assertJsonPath('data.id', $this->propertyA->id);
});

test('an owner gets a 404, not a 403, for another owner\'s property', function () {
    $response = $this->actingAs($this->ownerA)->getJson("/api/v1/owner/properties/{$this->propertyB->id}");

    $response->assertStatus(404);
});

test('an owner cannot create, update, or delete any property - read only', function () {
    $this->actingAs($this->ownerA)->postJson('/api/v1/properties', [])->assertStatus(403);
    $this->actingAs($this->ownerA)->putJson("/api/v1/properties/{$this->propertyA->id}", [])->assertStatus(403);
    $this->actingAs($this->ownerA)->deleteJson("/api/v1/properties/{$this->propertyA->id}")->assertStatus(403);
});

test('an owner sees every status/approval_status of their own property, nothing hidden', function () {
    $pending = Property::factory()->create([
        'owner_contact_id' => $this->contactA->id,
        'approval_status' => 'pending_approval',
    ]);

    $response = $this->actingAs($this->ownerA)->getJson('/api/v1/owner/properties');

    $response->assertOk()->assertJsonCount(2, 'data');
    expect(collect($response->json('data'))->pluck('id'))->toContain($pending->id);
});
