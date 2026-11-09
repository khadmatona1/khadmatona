<?php

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Models\Visit;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Owner');

    $this->contact = Contact::factory()->create(['type' => 'landlord']);
    $this->owner = User::factory()->create(['contact_id' => $this->contact->id]);
    $this->owner->assignRole('Owner');
    $this->property = Property::factory()->create(['owner_contact_id' => $this->contact->id]);

    $this->createLead = fn (int $propertyId) => Lead::create([
        'type' => 'visit_request',
        'status' => 'new',
        'name' => 'Test Lead',
        'email' => 'lead-'.uniqid().'@example.com',
        'property_id' => $propertyId,
    ]);
});

test('leads_count matches the number of leads for the property', function () {
    ($this->createLead)($this->property->id);
    ($this->createLead)($this->property->id);
    $otherProperty = Property::factory()->create();
    ($this->createLead)($otherProperty->id);

    $response = $this->actingAs($this->owner)->getJson("/api/v1/owner/properties/{$this->property->id}");

    $response->assertOk()->assertJsonPath('data.leads_count', 2);
});

test('a soft-deleted lead is excluded from leads_count', function () {
    $lead = ($this->createLead)($this->property->id);
    ($this->createLead)($this->property->id);
    $lead->delete();

    $response = $this->actingAs($this->owner)->getJson("/api/v1/owner/properties/{$this->property->id}");

    $response->assertOk()->assertJsonPath('data.leads_count', 1);
});

test('completed_visits_count only counts status=completed visits', function () {
    $leadA = ($this->createLead)($this->property->id);
    $leadB = ($this->createLead)($this->property->id);
    $leadC = ($this->createLead)($this->property->id);

    Visit::create(['lead_id' => $leadA->id, 'property_id' => $this->property->id, 'scheduled_at' => now(), 'status' => 'completed', 'completed_at' => now()]);
    Visit::create(['lead_id' => $leadB->id, 'property_id' => $this->property->id, 'scheduled_at' => now()->addDay(), 'status' => 'scheduled']);
    Visit::create(['lead_id' => $leadC->id, 'property_id' => $this->property->id, 'scheduled_at' => now(), 'status' => 'cancelled']);

    $response = $this->actingAs($this->owner)->getJson("/api/v1/owner/properties/{$this->property->id}");

    $response->assertOk()->assertJsonPath('data.completed_visits_count', 1);
});

test('counts for a property with no activity are zero, not missing', function () {
    $response = $this->actingAs($this->owner)->getJson("/api/v1/owner/properties/{$this->property->id}");

    $response->assertOk()
        ->assertJsonPath('data.leads_count', 0)
        ->assertJsonPath('data.completed_visits_count', 0);
});
