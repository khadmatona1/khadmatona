<?php

use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Application\Jobs\SendVisitConfirmationJob;
use App\Modules\Visit\Domain\Models\Visit;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\Support\FakeWhatsAppGateway;

beforeEach(function () {
    // Admin is the notify-fallback recipient for an ownerless property's
    // booking (CreateVisitAction::notifyCommercial) - the properties used
    // below have no commercial_id.
    Role::findOrCreate('Admin');

    $this->whatsApp = new FakeWhatsAppGateway;
    $this->app->instance(WhatsAppGateway::class, $this->whatsApp);

    $this->lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'Test Visitor', 'email' => 't@example.com', 'phone' => '+212612345678']);
    $this->property = Property::factory()->create();
});

test('booking a visit dispatches the confirmation job', function () {
    Queue::fake();

    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 't@example.com',
        'phone' => '+212612345678',
        'property_id' => $this->property->id,
        'scheduled_at' => '2027-09-23T09:00:00Z',
    ])->assertStatus(201);

    Queue::assertPushed(SendVisitConfirmationJob::class);
});

test('with WhatsApp configured, the confirmation is sent as a System message and whatsapp_confirmed_at is set', function () {
    $visit = Visit::create([
        'lead_id' => $this->lead->id,
        'property_id' => $this->property->id,
        'scheduled_at' => '2027-09-23T09:00:00Z',
        'status' => 'scheduled',
    ]);

    SendVisitConfirmationJob::dispatchSync($visit->id);

    expect($this->whatsApp->templates)->toHaveCount(1);
    expect($this->whatsApp->templates[0]['to'])->toBe('212612345678');
    expect($visit->fresh()->whatsapp_confirmed_at)->not->toBeNull();

    $message = Message::latest()->first();
    expect($message->sender_type)->toBe(MessageSenderType::System);
});

test('with WhatsApp not configured, sending gracefully no-ops', function () {
    $this->whatsApp->configured = false;

    $visit = Visit::create([
        'lead_id' => $this->lead->id,
        'property_id' => $this->property->id,
        'scheduled_at' => '2027-09-23T09:00:00Z',
        'status' => 'scheduled',
    ]);

    SendVisitConfirmationJob::dispatchSync($visit->id);

    expect($this->whatsApp->templates)->toHaveCount(0);
    expect($visit->fresh()->whatsapp_confirmed_at)->toBeNull();
});

test('a lead with no phone is skipped gracefully, never throws', function () {
    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'No Phone', 'email' => 'nophone@example.com', 'phone' => null]);
    $visit = Visit::create([
        'lead_id' => $lead->id,
        'property_id' => $this->property->id,
        'scheduled_at' => '2027-09-23T09:00:00Z',
        'status' => 'scheduled',
    ]);

    SendVisitConfirmationJob::dispatchSync($visit->id);

    expect($this->whatsApp->templates)->toHaveCount(0);
    expect($visit->fresh()->whatsapp_confirmed_at)->toBeNull();
});
