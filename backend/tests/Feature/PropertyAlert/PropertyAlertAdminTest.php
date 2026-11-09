<?php

use App\Models\User;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
});

test('a guest cannot list property alerts', function () {
    $this->getJson('/api/v1/property-alerts')->assertStatus(401);
});

test('an authenticated non-admin cannot list property alerts', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/property-alerts')->assertStatus(403);
});

test('an admin can list property alerts', function () {
    PropertyAlert::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)->getJson('/api/v1/property-alerts');

    $response->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('meta.pagination.total', 3);
});

test('an admin can filter property alerts by phone', function () {
    PropertyAlert::factory()->create(['phone_e164' => '+212611112222']);
    PropertyAlert::factory()->create(['phone_e164' => '+212699998888']);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/property-alerts?filter[phone]=611112222');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.phone', '+212611112222');
});

test('an admin can delete a property alert', function () {
    $alert = PropertyAlert::factory()->create();

    $this->actingAs($this->admin)->deleteJson("/api/v1/property-alerts/{$alert->id}")->assertOk();

    $this->assertDatabaseMissing('property_alerts', ['id' => $alert->id]);
});

test('a non-admin cannot delete a property alert', function () {
    $alert = PropertyAlert::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->deleteJson("/api/v1/property-alerts/{$alert->id}")->assertStatus(403);
});
