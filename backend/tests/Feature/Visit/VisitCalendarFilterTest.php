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
    $this->commercialA = User::factory()->create();
    $this->commercialA->assignRole('Commercial');
    $this->commercialB = User::factory()->create();
    $this->commercialB->assignRole('Commercial');

    $this->property = Property::factory()->create();

    $this->makeVisit = function (string $scheduledAt, ?int $commercialId) {
        $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => uniqid().'@example.com', 'phone' => '+212612345678']);

        return Visit::create([
            'lead_id' => $lead->id,
            'property_id' => $this->property->id,
            'commercial_id' => $commercialId,
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
        ]);
    };
});

test('a guest cannot list visits', function () {
    $this->getJson('/api/v1/visits')->assertStatus(401);
});

test('an admin sees every visit regardless of assignment', function () {
    ($this->makeVisit)('2027-09-05T09:00:00Z', $this->commercialA->id);
    ($this->makeVisit)('2027-09-10T09:00:00Z', $this->commercialB->id);
    ($this->makeVisit)('2027-09-15T09:00:00Z', null);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/visits');

    $response->assertOk()->assertJsonCount(3, 'data');
});

test('a commercial sees only visits currently assigned to them', function () {
    ($this->makeVisit)('2027-09-05T09:00:00Z', $this->commercialA->id);
    ($this->makeVisit)('2027-09-10T09:00:00Z', $this->commercialB->id);

    $response = $this->actingAs($this->commercialA)->getJson('/api/v1/visits');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.commercial_id', $this->commercialA->id);
});

test('visits can be filtered by a from/to date range', function () {
    ($this->makeVisit)('2027-09-05T09:00:00Z', null);
    ($this->makeVisit)('2027-10-05T09:00:00Z', null);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/visits?'.http_build_query([
        'filter' => ['from' => '2027-09-01', 'to' => '2027-09-30'],
    ]));

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('visits can be filtered by status', function () {
    $visit = ($this->makeVisit)('2027-09-05T09:00:00Z', null);
    $visit->update(['status' => 'cancelled']);
    ($this->makeVisit)('2027-09-10T09:00:00Z', null);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/visits?filter[status]=cancelled');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'cancelled');
});
