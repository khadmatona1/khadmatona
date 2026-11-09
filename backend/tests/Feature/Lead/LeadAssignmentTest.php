<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create()->assignRole('Admin');
    $this->commercial = User::factory()->create()->assignRole('Commercial');
    $this->lead = Lead::create(['type' => 'contact', 'name' => 'Client', 'email' => '', 'phone' => '0612345678', 'status' => 'new']);
});

test('only admins can assign leads and see assignment options', function () {
    $payload = ['lead_ids' => [$this->lead->id], 'commercial_id' => $this->commercial->id];
    $this->postJson('/api/v1/leads/assign', $payload)->assertUnauthorized();
    $this->actingAs($this->commercial)->postJson('/api/v1/leads/assign', $payload)->assertForbidden();
    $this->getJson('/api/v1/leads/assignment-options')->assertForbidden();
    expect($this->lead->fresh()->commercial_id)->toBeNull();
});

test('admin can assign multiple leads and ownership follows the assignment', function () {
    $old = User::factory()->create()->assignRole('Commercial');
    $other = Lead::create(['type' => 'sell_request', 'name' => 'Seller', 'email' => '', 'status' => 'new', 'commercial_id' => $old->id]);
    $this->actingAs($this->admin)->postJson('/api/v1/leads/assign', [
        'lead_ids' => [$this->lead->id, $other->id], 'commercial_id' => $this->commercial->id,
    ])->assertOk()->assertJsonPath('data.assigned', 2);
    expect($this->lead->fresh()->commercial_id)->toBe($this->commercial->id);
    $this->actingAs($this->commercial)->getJson('/api/v1/leads/'.$other->id)->assertOk();
    $this->getJson('/api/v1/leads')->assertOk()->assertJsonCount(2, 'data');
    $this->actingAs($old)->getJson('/api/v1/leads/'.$other->id)->assertForbidden();
    $this->getJson('/api/v1/leads')->assertOk()->assertJsonCount(0, 'data');
});

test('invalid targets and missing leads never partially assign a batch', function () {
    $inactive = User::factory()->create(['is_active' => false])->assignRole('Commercial');
    $this->actingAs($this->admin);
    foreach ([$inactive->id, $this->admin->id] as $target) {
        $this->postJson('/api/v1/leads/assign', ['lead_ids' => [$this->lead->id], 'commercial_id' => $target])
            ->assertUnprocessable()->assertJsonValidationErrors('commercial_id');
    }
    $this->postJson('/api/v1/leads/assign', ['lead_ids' => [$this->lead->id, 999999], 'commercial_id' => $this->commercial->id])
        ->assertUnprocessable()->assertJsonValidationErrors('lead_ids');
    $this->postJson('/api/v1/leads/assign', ['lead_ids' => [$this->lead->id, $this->lead->id], 'commercial_id' => $this->commercial->id])
        ->assertUnprocessable();
    expect($this->lead->fresh()->commercial_id)->toBeNull();
});

test('assignment options contain only active commercial roles', function () {
    User::factory()->create(['is_active' => false])->assignRole('Commercial');
    $senior = User::factory()->create()->assignRole('SeniorCommercial');
    $response = $this->actingAs($this->admin)->getJson('/api/v1/leads/assignment-options')->assertOk();
    expect(collect($response->json('data'))->pluck('id')->sort()->values()->all())
        ->toBe(collect([$this->commercial->id, $senior->id])->sort()->values()->all());
});
