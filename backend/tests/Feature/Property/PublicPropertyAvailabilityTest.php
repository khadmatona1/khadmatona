<?php

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

test('public lists and counts include only available approved properties', function () {
    $available = Property::factory()->create(['status' => 'disponible', 'approval_status' => 'approved']);
    foreach (['reserve', 'vendu', 'loue'] as $status) {
        Property::factory()->create(['status' => $status, 'approval_status' => 'approved']);
    }
    Property::factory()->create(['status' => 'disponible', 'approval_status' => 'pending_approval']);

    $this->getJson('/api/v1/properties')->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $available->id)
        ->assertJsonPath('meta.pagination.total', 1);
    $this->getJson('/api/v1/properties/facets')->assertOk()
        ->assertJsonPath('data.status', ['disponible' => 1]);
    $this->getJson('/api/v1/properties?filter[status]=vendu')->assertOk()->assertJsonCount(0, 'data');
});

test('unavailable property details are hidden publicly while admins retain access', function (string $status) {
    $property = Property::factory()->create(['status' => $status, 'approval_status' => 'approved']);
    $this->getJson("/api/v1/properties/{$property->id}")->assertNotFound();

    Role::findOrCreate('Admin');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');
    $this->actingAs($admin, 'sanctum');
    $this->getJson("/api/v1/properties/{$property->id}")->assertNotFound();
    $this->getJson('/api/v1/dashboard/properties')->assertOk()->assertJsonCount(1, 'data');
})->with(['reserve', 'vendu', 'loue']);
