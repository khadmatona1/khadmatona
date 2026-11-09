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
    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('Commercial');

    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $property = Property::factory()->create();
    $this->visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'commercial_id' => $this->commercial->id,
        'scheduled_at' => now()->addDay(),
        'status' => 'scheduled',
    ]);
});

test('the assigned commercial can cancel their visit', function () {
    $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/cancel")
        ->assertOk()->assertJsonPath('data.status', 'cancelled');
});

test('an admin can cancel any visit', function () {
    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/cancel")
        ->assertOk()->assertJsonPath('data.status', 'cancelled');
});

test('an unrelated commercial cannot cancel', function () {
    $other = User::factory()->create();
    $other->assignRole('Commercial');

    $this->actingAs($other)->patchJson("/api/v1/visits/{$this->visit->id}/cancel")->assertStatus(403);
});

test('a guest cannot cancel', function () {
    $this->patchJson("/api/v1/visits/{$this->visit->id}/cancel")->assertStatus(401);
});
