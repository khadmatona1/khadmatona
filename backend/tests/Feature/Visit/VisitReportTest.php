<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Models\Visit;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Commercial');
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

test('outcome=interested marks the visit completed', function () {
    $response = $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/report", [
        'outcome' => 'interested',
        'report' => 'Très motivé, revient la semaine prochaine.',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('data.report_outcome', 'interested');
    $this->assertDatabaseHas('visits', ['id' => $this->visit->id, 'status' => 'completed']);
    expect($this->visit->fresh()->completed_at)->not->toBeNull();
});

test('outcome=not_interested and outcome=follow_up also mark the visit completed', function () {
    foreach (['not_interested', 'follow_up'] as $outcome) {
        $this->visit->update(['status' => 'scheduled', 'completed_at' => null]);

        $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/report", [
            'outcome' => $outcome,
        ])->assertOk()->assertJsonPath('data.status', 'completed');
    }
});

test('outcome=no_show marks the visit as no_show, not completed', function () {
    $response = $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/report", [
        'outcome' => 'no_show',
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'no_show');
});

test('an unrelated commercial cannot submit a report', function () {
    $other = User::factory()->create();
    $other->assignRole('Commercial');

    $this->actingAs($other)->patchJson("/api/v1/visits/{$this->visit->id}/report", [
        'outcome' => 'interested',
    ])->assertStatus(403);
});

test('an invalid outcome is rejected', function () {
    $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/report", [
        'outcome' => 'not-a-real-outcome',
    ])->assertStatus(422)->assertJsonValidationErrors('outcome');
});
