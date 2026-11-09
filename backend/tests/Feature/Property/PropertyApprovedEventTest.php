<?php

use App\Core\Lookup\Domain\Models\City;
use App\Models\User;
use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->city = City::factory()->withName('Marrakech')->create();
});

test('approve() fires PropertyApproved', function () {
    Event::fake([PropertyApproved::class]);
    $property = Property::factory()->create(['approval_status' => 'pending_approval']);

    $this->actingAs($this->admin)->patchJson("/api/v1/properties/{$property->id}/approve")->assertOk();

    Event::assertDispatched(PropertyApproved::class, fn ($event) => $event->propertyId === $property->id);
});

test('reject() never fires PropertyApproved', function () {
    Event::fake([PropertyApproved::class]);
    $property = Property::factory()->create(['approval_status' => 'pending_approval']);

    $this->actingAs($this->admin)->patchJson("/api/v1/properties/{$property->id}/reject", [
        'rejection_reason' => 'Not eligible',
    ])->assertOk();

    Event::assertNotDispatched(PropertyApproved::class);
});

test('a plain Commercial submission stays pending and never fires PropertyApproved', function () {
    Event::fake([PropertyApproved::class]);
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');

    $this->actingAs($commercial)->postJson('/api/v1/properties', [
        'title' => 'Villa test',
        'type' => 'villa',
        'status' => 'disponible',
        'city_id' => $this->city->id,
        'address' => 'Test address',
        'price' => 1_000_000,
        'surface' => 200,
        'bedrooms' => 3,
        'bathrooms' => 2,
        'description' => 'Test',
    ])->assertStatus(201);

    Event::assertNotDispatched(PropertyApproved::class);
});

test('an Admin-created listing fires PropertyApproved', function () {
    Event::fake([PropertyApproved::class]);

    $this->actingAs($this->admin)->postJson('/api/v1/properties', [
        'title' => 'Villa test',
        'type' => 'villa',
        'status' => 'disponible',
        'city_id' => $this->city->id,
        'address' => 'Test address',
        'price' => 1_000_000,
        'surface' => 200,
    ])->assertStatus(201);

    Event::assertDispatched(PropertyApproved::class);
});
