<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Application\Jobs\SendVisitConfirmationJob;
use App\Modules\Visit\Domain\Models\Visit;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\Support\FakeWhatsAppGateway;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('Commercial');

    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $property = Property::factory()->create();
    // Fixed, known-weekday, business-hours instants - never "now()->addDays(N)",
    // which could land on a Sunday depending on when the suite runs.
    $this->originalTime = Carbon::parse('2027-09-23T09:00:00Z'); // Thursday 09:00 Morocco time (GMT)
    $this->newTime = Carbon::parse('2027-09-24T13:00:00Z');       // Friday 13:00 Morocco time (GMT)
    $this->visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'commercial_id' => $this->commercial->id,
        'scheduled_at' => $this->originalTime,
        'status' => 'scheduled',
        'whatsapp_confirmed_at' => now(),
    ]);
});

test('the assigned commercial can reschedule their visit', function () {
    $response = $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => $this->newTime->toIso8601String(),
    ]);

    $response->assertOk();
    $this->visit->refresh();
    expect($this->visit->scheduled_at->equalTo($this->newTime))->toBeTrue();
});

test('an admin can reschedule any visit', function () {
    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => $this->newTime->toIso8601String(),
    ])->assertOk();
});

test('an unrelated commercial cannot reschedule', function () {
    $other = User::factory()->create();
    $other->assignRole('Commercial');

    $this->actingAs($other)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => $this->newTime->toIso8601String(),
    ])->assertStatus(403);
});

test('rescheduling to an actually different time dispatches a fresh confirmation and resets whatsapp_confirmed_at', function () {
    Queue::fake();

    $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => $this->newTime->toIso8601String(),
    ])->assertOk();

    Queue::assertPushed(SendVisitConfirmationJob::class, fn ($job) => $job->visitId === $this->visit->id);
    $this->assertDatabaseHas('visits', ['id' => $this->visit->id, 'whatsapp_confirmed_at' => null]);
});

test('resubmitting the same scheduled_at does not re-dispatch the confirmation', function () {
    Queue::fake();

    $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => $this->originalTime->toIso8601String(),
    ])->assertOk();

    Queue::assertNotPushed(SendVisitConfirmationJob::class);
    expect($this->visit->fresh()->whatsapp_confirmed_at)->not->toBeNull();
});

test('rescheduling in the past or outside business hours is rejected', function () {
    $this->actingAs($this->commercial)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => '2020-01-01T09:00:00Z',
    ])->assertStatus(422)->assertJsonValidationErrors('scheduled_at');
});

// Morocco is on GMT (config('app.business_timezone') = UTC by default), so
// the 9h-19h window is 09:00-19:00 GMT - no longer shifted by an hour.
test('business hours for a reschedule are 9h to 19h Morocco time on GMT', function (string $iso, int $status) {
    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => $iso,
    ])->assertStatus($status);
})->with([
    '09:00 GMT opens' => ['2027-09-24T09:00:00Z', 200],
    '08:30 GMT is before opening' => ['2027-09-24T08:30:00Z', 422],
    '18:30 GMT is still open' => ['2027-09-24T18:30:00Z', 200],
    '19:00 GMT is closed' => ['2027-09-24T19:00:00Z', 422],
]);

test('the WhatsApp confirmation after a reschedule states the Morocco time on GMT', function () {
    $whatsApp = new FakeWhatsAppGateway;
    $this->app->instance(WhatsAppGateway::class, $whatsApp);

    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => '2027-09-24T13:00:00Z',
    ])->assertOk();

    expect($whatsApp->templates)->not->toBeEmpty()
        ->and($whatsApp->templates[array_key_last($whatsApp->templates)]['params'])->toContain('24/09/2027 13:00');
});

test('switching the business timezone back to Africa/Casablanca restores UTC+1', function () {
    config(['app.business_timezone' => 'Africa/Casablanca']);

    // 08:30 GMT is 09:30 under UTC+1: valid again.
    $this->actingAs($this->admin)->patchJson("/api/v1/visits/{$this->visit->id}/reschedule", [
        'scheduled_at' => '2027-09-24T08:30:00Z',
    ])->assertOk();
});
