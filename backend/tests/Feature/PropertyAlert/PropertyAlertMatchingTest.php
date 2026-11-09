<?php

use App\Core\Lookup\Domain\Models\City;
use App\Models\User;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\PropertyAlert\Application\Jobs\MatchPropertyAlertsJob;
use App\Modules\PropertyAlert\Application\PropertyAlertMatcher;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlertMatch;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\Support\FakeWhatsAppGateway;

beforeEach(function () {
    Role::findOrCreate('Admin');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    $this->whatsApp = new FakeWhatsAppGateway;
    $this->app->instance(WhatsAppGateway::class, $this->whatsApp);

    $this->marrakech = City::factory()->withName('Marrakech')->create();
});

test('rental alerts only match the requested transaction and price period', function () {
    $alert = PropertyAlert::factory()->create(['transaction_type' => 'rent', 'price_period' => 'month']);
    $sale = Property::factory()->create(['transaction_type' => 'sale']);
    $nightly = Property::factory()->create(['transaction_type' => 'rent', 'price_period' => 'night']);
    $legacy = Property::factory()->create();
    $monthly = Property::factory()->create(['transaction_type' => 'rent', 'price_period' => 'month']);

    foreach ([$sale, $nightly, $legacy, $monthly] as $property) {
        MatchPropertyAlertsJob::dispatchSync($property->id);
    }

    expect(PropertyAlertMatch::where('property_alert_id', $alert->id)->pluck('property_id')->all())->toBe([$monthly->id]);
});

test('approving a property matches a saved alert and sends a WhatsApp template', function () {
    $alert = PropertyAlert::factory()->create([
        'phone_e164' => '+212612345678',
        'city_id' => $this->marrakech->id,
        'surface_min' => 80,
    ]);

    $property = Property::factory()->create([
        'approval_status' => 'pending_approval',
        'city_id' => $this->marrakech->id,
        'surface' => 120,
    ]);

    $this->actingAs($this->admin)->patchJson("/api/v1/properties/{$property->id}/approve")->assertOk();

    expect(PropertyAlertMatch::where('property_alert_id', $alert->id)->where('property_id', $property->id)->exists())->toBeTrue();
    expect($this->whatsApp->templates)->toHaveCount(1);
    expect($this->whatsApp->templates[0]['to'])->toBe('212612345678');
});

test('a pending-approval property never matches or notifies any alert', function () {
    PropertyAlert::factory()->create(['city_id' => $this->marrakech->id]);
    $property = Property::factory()->create([
        'approval_status' => 'pending_approval',
        'city_id' => $this->marrakech->id,
    ]);

    (new PropertyAlertMatcher(
        app(PropertyRepositoryInterface::class),
        $this->whatsApp,
    ))->match($property->id);

    expect(PropertyAlertMatch::count())->toBe(0);
    expect($this->whatsApp->templates)->toHaveCount(0);
});

test('an alert criterion that does not match excludes the property', function () {
    $alert = PropertyAlert::factory()->create([
        'city_id' => $this->marrakech->id,
        'surface_min' => 200,
    ]);
    $property = Property::factory()->create([
        'city_id' => $this->marrakech->id,
        'surface' => 100, // below the alert's surface_min
    ]);

    MatchPropertyAlertsJob::dispatchSync($property->id);

    expect(PropertyAlertMatch::where('property_alert_id', $alert->id)->exists())->toBeFalse();
});

test('re-approving/re-matching the same property never notifies the same alert twice', function () {
    $alert = PropertyAlert::factory()->create();
    $property = Property::factory()->create();

    MatchPropertyAlertsJob::dispatchSync($property->id);
    MatchPropertyAlertsJob::dispatchSync($property->id);

    expect(PropertyAlertMatch::where('property_alert_id', $alert->id)->where('property_id', $property->id)->count())->toBe(1);
    expect($this->whatsApp->templates)->toHaveCount(1);
});

test('a SeniorCommercial auto-approved property dispatches matching', function () {
    Queue::fake();
    Role::findOrCreate('SeniorCommercial');
    $senior = User::factory()->create();
    $senior->assignRole('SeniorCommercial');

    $this->actingAs($senior)->postJson('/api/v1/properties', [
        'title' => 'Villa test',
        'type' => 'villa',
        'status' => 'disponible',
        'city_id' => $this->marrakech->id,
        'address' => 'Test address',
        'price' => 1_000_000,
        'surface' => 200,
        'bedrooms' => 3,
        'bathrooms' => 2,
        'description' => 'Test',
    ])->assertStatus(201);

    Queue::assertPushed(MatchPropertyAlertsJob::class);
});

test('editing an already-approved property again does not re-dispatch matching', function () {
    Queue::fake();
    Role::findOrCreate('SeniorCommercial');
    $senior = User::factory()->create();
    $senior->assignRole('SeniorCommercial');
    $property = Property::factory()->create(['commercial_id' => $senior->id, 'approval_status' => 'approved']);

    $this->actingAs($senior)->putJson("/api/v1/properties/{$property->id}", [
        'title' => 'Updated title',
        'type' => $property->type->value,
        'status' => $property->status->value,
        'city_id' => $property->city_id,
        'address' => $property->address,
        'price' => $property->price / 100,
        'surface' => $property->surface,
        'bedrooms' => $property->bedrooms,
        'bathrooms' => $property->bathrooms,
        'description' => $property->description,
    ])->assertOk();

    Queue::assertNotPushed(MatchPropertyAlertsJob::class);
});
