<?php

use App\Core\Notification\Notifications\VisitAssigned;
use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('SeniorCommercial');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
});

test('booking a visit for a property with an owner notifies that commercial', function () {
    Notification::fake();
    $commercial = User::factory()->create();
    $commercial->assignRole('SeniorCommercial');
    $property = Property::factory()->create(['commercial_id' => $commercial->id]);

    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $property->id,
        'scheduled_at' => '2027-09-23T09:00:00Z',
    ])->assertStatus(201);

    Notification::assertSentTo($commercial, VisitAssigned::class);
    Notification::assertNotSentTo($this->admin, VisitAssigned::class);
});

test('booking a visit for an ownerless property notifies every admin instead', function () {
    Notification::fake();
    $property = Property::factory()->create(['commercial_id' => null]);

    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $property->id,
        'scheduled_at' => '2027-09-23T09:00:00Z',
    ])->assertStatus(201);

    Notification::assertSentTo($this->admin, VisitAssigned::class);
});

test('reassigning a visit notifies the newly assigned commercial', function () {
    Notification::fake();
    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $property = Property::factory()->create();
    $visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'scheduled_at' => now()->addDay(),
        'status' => 'scheduled',
    ]);
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');

    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$visit->id}/assign", [
        'commercial_id' => $commercial->id,
    ])->assertOk();

    Notification::assertSentTo($commercial, VisitAssigned::class);
});

test('reassigning to the same commercial again does not re-notify', function () {
    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $property = Property::factory()->create();
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');
    $visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'commercial_id' => $commercial->id,
        'scheduled_at' => now()->addDay(),
        'status' => 'scheduled',
    ]);

    Notification::fake();

    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$visit->id}/assign", [
        'commercial_id' => $commercial->id,
    ])->assertOk();

    Notification::assertNothingSent();
});

test('clearing an assignment does not notify anyone', function () {
    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $property = Property::factory()->create();
    $commercial = User::factory()->create();
    $visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'commercial_id' => $commercial->id,
        'scheduled_at' => now()->addDay(),
        'status' => 'scheduled',
    ]);

    Notification::fake();

    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$visit->id}/assign", [
        'commercial_id' => null,
    ])->assertOk();

    Notification::assertNothingSent();
});
