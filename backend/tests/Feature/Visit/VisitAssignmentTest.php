<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Models\Visit;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $property = Property::factory()->create();
    $this->visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'scheduled_at' => now()->addDay(),
        'status' => 'scheduled',
    ]);
});

test('an admin can assign a visit to a commercial', function () {
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');

    $response = $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/assign", [
        'commercial_id' => $commercial->id,
    ]);

    $response->assertOk()->assertJsonPath('data.commercial_id', $commercial->id);
    $this->assertDatabaseHas('visits', ['id' => $this->visit->id, 'commercial_id' => $commercial->id]);
});

test('an admin can clear a visit assignment', function () {
    $commercial = User::factory()->create();
    $this->visit->update(['commercial_id' => $commercial->id]);

    $response = $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/assign", [
        'commercial_id' => null,
    ]);

    $response->assertOk()->assertJsonPath('data.commercial_id', null);
});

test('a non-admin cannot assign a visit', function () {
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');

    $this->actingAs($commercial)->patchJson("/api/v1/visits/{$this->visit->id}/assign", [
        'commercial_id' => $commercial->id,
    ])->assertStatus(403);
});

test('assigning a visit never touches the underlying Lead\'s own commercial_id', function () {
    $commercial = User::factory()->create();

    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/assign", [
        'commercial_id' => $commercial->id,
    ])->assertOk();

    $this->assertDatabaseHas('leads', ['id' => $this->visit->lead_id, 'commercial_id' => null]);
});
