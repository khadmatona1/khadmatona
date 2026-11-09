<?php

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Rental\Domain\Models\Cleaning;
use App\Modules\Rental\Domain\Models\Reservation;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial', 'Owner'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    $this->contact = Contact::factory()->create(['type' => 'landlord']);
    $this->property = Property::factory()->create(['title' => 'Riad Kasbah', 'owner_contact_id' => $this->contact->id]);
    $this->otherProperty = Property::factory()->create(['title' => 'Villa Autre']);

    // Commission 20 %, cleaning 150 MAD at the owner's expense.
    $this->managed = $this->actingAs($this->admin)->postJson('/api/v1/rental/properties', [
        'property_id' => $this->property->id,
        'commission_rate' => 20,
        'cleaning_fee' => 150,
        'cleaning_charged_to' => 'owner',
    ])->assertStatus(201)->json('data');

    $this->book = fn (array $overrides = []) => $this->actingAs($this->admin)->postJson('/api/v1/rental/reservations', array_merge([
        'rental_property_id' => $this->managed['id'],
        'guest_name' => 'John Traveler',
        'guest_phone' => '+33612345678',
        'channel' => 'airbnb',
        'check_in_date' => '2026-10-05',
        'check_out_date' => '2026-10-08',
        'total_amount' => 3000,
        'platform_fee' => 450,
    ], $overrides));
});

test('the rental back office rejects guests and owners and scopes ordinary commercials', function () {
    $commercial = tap(User::factory()->create())->assignRole('Commercial');
    $owner = tap(User::factory()->create(['contact_id' => $this->contact->id]))->assignRole('Owner');

    foreach (['/api/v1/rental/dashboard', '/api/v1/rental/reservations', '/api/v1/rental/statement'] as $url) {
        $this->app['auth']->forgetGuards();
        $this->getJson($url)->assertStatus(401);
        $this->actingAs($commercial)->getJson($url)->assertOk();
        $this->actingAs($owner)->getJson($url)->assertStatus(403);
    }
});

test('senior commercials can read the rental workspace and manage properties and reservations', function () {
    $senior = User::factory()->create()->assignRole('SeniorCommercial');
    $this->property->update(['commercial_id' => $senior->id]);
    $this->otherProperty->update(['commercial_id' => $senior->id]);
    $this->actingAs($senior);
    foreach (['dashboard', 'properties', 'reservations', 'cleanings', 'maintenance', 'expenses', 'booking-requests'] as $endpoint) {
        $this->getJson('/api/v1/rental/'.$endpoint)->assertOk();
    }
    $this->getJson('/api/v1/rental/statement?month=2026-10')->assertOk();
    $this->postJson('/api/v1/rental/properties', ['property_id' => $this->otherProperty->id, 'commission_rate' => 20])->assertCreated();
    $this->putJson('/api/v1/rental/properties/'.$this->managed['id'], ['commission_rate' => 25])->assertOk();
    $id = $this->postJson('/api/v1/rental/reservations', [
        'rental_property_id' => $this->managed['id'], 'guest_name' => 'Senior booking',
        'channel' => 'direct', 'check_in_date' => '2026-10-05', 'check_out_date' => '2026-10-08',
        'total_amount' => 3000, 'platform_fee' => 0,
    ])->assertCreated()->json('data.id');
    $this->patchJson('/api/v1/rental/reservations/'.$id.'/cancel')->assertOk();
    $this->getJson('/api/v1/dashboard/stats')->assertForbidden();
});

test('senior rental lists totals and direct access exclude other commercials properties', function () {
    $senior = User::factory()->create()->assignRole('SeniorCommercial');
    $this->otherProperty->update(['commercial_id' => $senior->id]);
    $own = $this->postJson('/api/v1/rental/properties', ['property_id' => $this->otherProperty->id, 'commission_rate' => 20])->assertCreated()->json('data.id');
    $foreignReservation = ($this->book)()->assertCreated()->json('data.id');
    $foreignCleaning = $this->postJson('/api/v1/rental/cleanings', [
        'rental_property_id' => $this->managed['id'], 'scheduled_for' => '2026-10-08', 'charged_to' => 'owner',
    ])->assertCreated()->json('data.id');
    $foreignMaintenance = $this->postJson('/api/v1/rental/maintenance', [
        'rental_property_id' => $this->managed['id'], 'title' => 'Repair', 'priority' => 'urgent', 'charged_to' => 'owner',
    ])->assertCreated()->json('data.id');
    $foreignExpense = $this->postJson('/api/v1/rental/expenses', [
        'rental_property_id' => $this->managed['id'], 'category' => 'other', 'label' => 'Foreign expense',
        'amount' => 100, 'incurred_on' => '2026-10-05', 'charged_to' => 'owner',
    ])->assertCreated()->json('data.id');
    $this->actingAs($senior)->getJson('/api/v1/rental/properties')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own);
    foreach (['reservations', 'cleanings', 'maintenance', 'expenses', 'booking-requests'] as $endpoint) {
        $this->getJson('/api/v1/rental/'.$endpoint)->assertOk()->assertJsonCount(0, 'data');
    }
    $this->getJson('/api/v1/rental/dashboard')->assertJsonPath('data.counts.managed_properties', 1)
        ->assertJsonPath('data.counts.pending_cleanings', 0)->assertJsonPath('data.counts.open_maintenance', 0)
        ->assertJsonPath('data.month.gross', 0);
    $this->getJson('/api/v1/rental/statement?month=2026-10')->assertJsonCount(1, 'data.properties')
        ->assertJsonPath('data.properties.0.property_id', $this->otherProperty->id)->assertJsonPath('data.totals.gross', 0);
    $this->getJson('/api/v1/rental/properties/'.$this->managed['id'])->assertNotFound();
    $this->putJson('/api/v1/rental/properties/'.$this->managed['id'], ['commission_rate' => 50])->assertNotFound();
    $this->deleteJson('/api/v1/rental/properties/'.$this->managed['id'])->assertNotFound();
    $this->getJson('/api/v1/rental/reservations/'.$foreignReservation)->assertNotFound();
    $this->patchJson('/api/v1/rental/reservations/'.$foreignReservation.'/cancel')->assertNotFound();
    foreach (['cleanings' => $foreignCleaning, 'maintenance' => $foreignMaintenance, 'expenses' => $foreignExpense] as $endpoint => $id) {
        $this->putJson('/api/v1/rental/'.$endpoint.'/'.$id, [])->assertNotFound();
        $this->deleteJson('/api/v1/rental/'.$endpoint.'/'.$id)->assertNotFound();
    }
    $this->postJson('/api/v1/rental/properties', ['property_id' => $this->property->id, 'commission_rate' => 20])->assertForbidden();
    $this->postJson('/api/v1/rental/cleanings', [
        'rental_property_id' => $this->managed['id'], 'scheduled_for' => '2026-10-08', 'charged_to' => 'owner',
    ])->assertUnprocessable();
    $this->actingAs($this->admin)->getJson('/api/v1/rental/properties')->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/rental/reservations')->assertJsonCount(1, 'data');
    $this->otherProperty->update(['commercial_id' => null]);
    $this->actingAs($senior)->getJson('/api/v1/rental/properties')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/rental/properties/'.$own)->assertNotFound();
    $this->getJson('/api/v1/rental/dashboard')->assertJsonPath('data.counts.managed_properties', 0);
});

test('a property can only be put under management once, and can come back after removal', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/rental/properties', ['property_id' => $this->property->id, 'commission_rate' => 25])
        ->assertStatus(422)->assertJsonValidationErrors('property_id');

    $this->actingAs($this->admin)->deleteJson("/api/v1/rental/properties/{$this->managed['id']}")->assertOk();

    $this->actingAs($this->admin)->postJson('/api/v1/rental/properties', ['property_id' => $this->property->id, 'commission_rate' => 25])
        ->assertStatus(201)
        ->assertJsonPath('data.id', $this->managed['id'])
        ->assertJsonPath('data.commission_rate', 25)
        ->assertJsonPath('data.property_title', 'Riad Kasbah');
});

test('a reservation stores money in cents, freezes the commission and computes the stay', function () {
    ($this->book)()
        ->assertStatus(201)
        ->assertJsonPath('data.nights', 3)
        ->assertJsonPath('data.total_amount', 3000)
        ->assertJsonPath('data.net_revenue', 2550)
        ->assertJsonPath('data.commission_rate', 20)
        ->assertJsonPath('data.commission', 510)
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.property_title', 'Riad Kasbah');

    expect(Reservation::first()->total_amount)->toBe(300_000);

    // Changing the rate later never rewrites an existing stay.
    $this->actingAs($this->admin)->putJson("/api/v1/rental/properties/{$this->managed['id']}", ['commission_rate' => 30])->assertOk();
    $this->actingAs($this->admin)->getJson('/api/v1/rental/reservations/'.Reservation::first()->id)
        ->assertJsonPath('data.commission_rate', 20);
});

test('overlapping stays are refused but same-day turnover is fine', function () {
    ($this->book)()->assertStatus(201);

    ($this->book)(['check_in_date' => '2026-10-07', 'check_out_date' => '2026-10-10'])
        ->assertStatus(422)->assertJsonValidationErrors('check_in_date');

    ($this->book)(['check_in_date' => '2026-10-08', 'check_out_date' => '2026-10-10'])->assertStatus(201);
});

test('a cancelled stay frees its dates', function () {
    $id = ($this->book)()->json('data.id');
    $this->actingAs($this->admin)->patchJson("/api/v1/rental/reservations/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');

    ($this->book)()->assertStatus(201);
});

test('invalid stays are refused', function (array $overrides, string $field) {
    ($this->book)($overrides)->assertStatus(422)->assertJsonValidationErrors($field);
})->with([
    'check-out before check-in' => [['check_out_date' => '2026-10-04'], 'check_out_date'],
    'platform fee above total' => [['platform_fee' => 5000], 'platform_fee'],
    'unknown channel' => [['channel' => 'fax'], 'channel'],
]);

test('an inactive managed property cannot be booked', function () {
    $this->actingAs($this->admin)->putJson("/api/v1/rental/properties/{$this->managed['id']}", ['commission_rate' => 20, 'is_active' => false])->assertOk();

    ($this->book)()->assertStatus(422)->assertJsonValidationErrors('rental_property_id');
});

test('check-in then check-out, and the cleaning is scheduled automatically', function () {
    $id = ($this->book)()->json('data.id');

    // Can't check out before checking in.
    $this->actingAs($this->admin)->patchJson("/api/v1/rental/reservations/{$id}/check-out")->assertStatus(422)->assertJsonValidationErrors('status');

    $this->actingAs($this->admin)->patchJson("/api/v1/rental/reservations/{$id}/check-in", ['notes' => 'Clés remises'])
        ->assertOk()->assertJsonPath('data.status', 'checked_in')->assertJsonPath('data.check_in_notes', 'Clés remises');

    // Can't cancel a stay that has started.
    $this->actingAs($this->admin)->patchJson("/api/v1/rental/reservations/{$id}/cancel")->assertStatus(422);

    $this->actingAs($this->admin)->patchJson("/api/v1/rental/reservations/{$id}/check-out")
        ->assertOk()->assertJsonPath('data.status', 'checked_out');

    $cleaning = Cleaning::first();
    expect($cleaning)->not->toBeNull()
        ->and($cleaning->reservation_id)->toBe($id)
        ->and($cleaning->status->value)->toBe('pending')
        ->and($cleaning->scheduled_for->toDateString())->toBe('2026-10-08')
        ->and($cleaning->cost)->toBe(15_000)
        ->and($cleaning->charged_to->value)->toBe('owner');
});

test('completing a cleaning and resolving maintenance stamp their dates', function () {
    $cleaningId = $this->actingAs($this->admin)->postJson('/api/v1/rental/cleanings', [
        'rental_property_id' => $this->managed['id'], 'scheduled_for' => '2026-10-02', 'cost' => 100, 'charged_to' => 'owner',
    ])->assertStatus(201)->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/rental/cleanings/{$cleaningId}", ['status' => 'done'])
        ->assertOk()->assertJsonPath('data.status', 'done')->assertJsonMissingPath('data.completed_at_is_null');
    expect(Cleaning::find($cleaningId)->completed_at)->not->toBeNull();

    $maintenanceId = $this->actingAs($this->admin)->postJson('/api/v1/rental/maintenance', [
        'rental_property_id' => $this->managed['id'], 'title' => 'Fuite salle de bain', 'priority' => 'urgent', 'charged_to' => 'owner',
    ])->assertStatus(201)->assertJsonPath('data.status', 'open')->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/rental/maintenance/{$maintenanceId}", ['status' => 'resolved', 'cost' => 400])
        ->assertOk()->assertJsonPath('data.status', 'resolved')->assertJsonPath('data.cost', 400);

    $this->actingAs($this->admin)->patchJson("/api/v1/rental/maintenance/{$maintenanceId}", ['status' => 'open'])
        ->assertOk()->assertJsonPath('data.resolved_at', null);
});

test('the monthly statement splits revenue between the owner and KHADMATONA', function () {
    // Two October stays: net 2550 + 1800 = 4350, commission 510 + 360 = 870.
    ($this->book)()->assertStatus(201);
    ($this->book)(['channel' => 'direct', 'check_in_date' => '2026-10-20', 'check_out_date' => '2026-10-22', 'total_amount' => 1800, 'platform_fee' => 0])->assertStatus(201);
    // A November stay and a cancelled October stay don't count.
    ($this->book)(['check_in_date' => '2026-11-02', 'check_out_date' => '2026-11-04'])->assertStatus(201);
    $cancelled = ($this->book)(['check_in_date' => '2026-10-25', 'check_out_date' => '2026-10-27'])->json('data.id');
    $this->actingAs($this->admin)->patchJson("/api/v1/rental/reservations/{$cancelled}/cancel")->assertOk();

    $managedId = $this->managed['id'];
    // Owner costs: cleaning 150 (done) + maintenance 400 (resolved) + water bill 250 = 800.
    $cleaning = $this->actingAs($this->admin)->postJson('/api/v1/rental/cleanings', ['rental_property_id' => $managedId, 'scheduled_for' => '2026-10-08', 'cost' => 150, 'charged_to' => 'owner'])->json('data.id');
    $this->actingAs($this->admin)->patchJson("/api/v1/rental/cleanings/{$cleaning}", ['status' => 'done'])->assertOk();
    // A pending cleaning doesn't count yet.
    $this->actingAs($this->admin)->postJson('/api/v1/rental/cleanings', ['rental_property_id' => $managedId, 'scheduled_for' => '2026-10-22', 'cost' => 150, 'charged_to' => 'owner'])->assertStatus(201);
    $this->actingAs($this->admin)->postJson('/api/v1/rental/expenses', ['rental_property_id' => $managedId, 'category' => 'utilities', 'label' => 'Facture eau', 'amount' => 250, 'incurred_on' => '2026-10-15', 'charged_to' => 'owner'])->assertStatus(201);
    // KHADMATONA cost: welcome supplies 120.
    $this->actingAs($this->admin)->postJson('/api/v1/rental/expenses', ['rental_property_id' => $managedId, 'category' => 'supplies', 'label' => 'Kit accueil', 'amount' => 120, 'incurred_on' => '2026-10-05', 'charged_to' => 'khadmatona'])->assertStatus(201);

    $maintenance = $this->actingAs($this->admin)->postJson('/api/v1/rental/maintenance', ['rental_property_id' => $managedId, 'title' => 'Chauffe-eau', 'priority' => 'normal', 'charged_to' => 'owner'])->json('data.id');
    $this->travelTo(Carbon::parse('2026-10-18 12:00:00'));
    $this->actingAs($this->admin)->patchJson("/api/v1/rental/maintenance/{$maintenance}", ['status' => 'resolved', 'cost' => 400])->assertOk();
    $this->travelBack();

    $row = $this->actingAs($this->admin)->getJson('/api/v1/rental/statement?month=2026-10')
        ->assertOk()
        ->assertJsonPath('data.month', '2026-10')
        ->json('data.properties.0');

    expect($row)->toMatchArray([
        'property_title' => 'Riad Kasbah',
        'reservations' => 2,
        'nights' => 5,
        'gross' => 4800,
        'platform_fees' => 450,
        'net_revenue' => 4350,
        'commission' => 870,
        'expenses_owner' => 800,
        'expenses_khadmatona' => 120,
        'owner_share' => 2680,      // 4350 - 870 - 800
        'khadmatona_share' => 750,  // 870 - 120
    ])->and($row['lines'])->toHaveCount(4);
});

test('the dashboard shows arrivals, departures, cleanings and occupancy', function () {
    $this->travelTo(Carbon::parse('2026-10-05 10:00:00'));
    ($this->book)()->assertStatus(201);
    ($this->book)(['check_in_date' => '2026-10-01', 'check_out_date' => '2026-10-04'])->assertStatus(201);

    $this->actingAs($this->admin)->getJson('/api/v1/rental/dashboard')
        ->assertOk()
        ->assertJsonPath('data.today', '2026-10-05')
        ->assertJsonPath('data.counts.managed_properties', 1)
        ->assertJsonPath('data.counts.arrivals_today', 1)
        ->assertJsonPath('data.arrivals.0.guest_name', 'John Traveler')
        // 6 booked nights out of 31.
        ->assertJsonPath('data.occupancy_rate', 19.4);
});

test('an owner sees their own statement and stays without guest identities', function () {
    ($this->book)()->assertStatus(201);
    $otherManaged = $this->actingAs($this->admin)->postJson('/api/v1/rental/properties', ['property_id' => $this->otherProperty->id, 'commission_rate' => 20])->json('data.id');
    ($this->book)(['rental_property_id' => $otherManaged])->assertStatus(201);

    $owner = tap(User::factory()->create(['contact_id' => $this->contact->id]))->assignRole('Owner');

    $statement = $this->actingAs($owner)->getJson('/api/v1/owner/rental/statement?month=2026-10')->assertOk();
    $statement->assertJsonCount(1, 'data.properties')
        ->assertJsonPath('data.properties.0.property_title', 'Riad Kasbah')
        ->assertJsonPath('data.properties.0.owner_share', 2040); // 2550 - 510

    $stays = $this->actingAs($owner)->getJson('/api/v1/owner/rental/reservations?month=2026-10')->assertOk();
    $stays->assertJsonCount(1, 'data')->assertJsonPath('data.0.nights', 3);
    expect(json_encode($stays->json()))->not->toContain('John Traveler')->not->toContain('+33612345678');
});

test('an owner without a linked contact sees nothing', function () {
    ($this->book)()->assertStatus(201);
    $owner = tap(User::factory()->create(['contact_id' => null]))->assignRole('Owner');

    $this->actingAs($owner)->getJson('/api/v1/owner/rental/statement?month=2026-10')
        ->assertOk()->assertJsonCount(0, 'data.properties');
});

test('reservation lists filter by period, status and search', function () {
    ($this->book)()->assertStatus(201);
    ($this->book)(['guest_name' => 'Amina', 'check_in_date' => '2026-11-10', 'check_out_date' => '2026-11-12'])->assertStatus(201);

    $this->actingAs($this->admin)->getJson('/api/v1/rental/reservations?filter[from]=2026-11-01&filter[to]=2026-11-30')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.guest_name', 'Amina')
        ->assertJsonPath('data.0.property_title', 'Riad Kasbah');

    $this->actingAs($this->admin)->getJson('/api/v1/rental/reservations?filter[search]=kasbah&sort=check_in_date')
        ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.guest_name', 'John Traveler');

    $this->actingAs($this->admin)->getJson('/api/v1/rental/reservations?filter[status]=cancelled')
        ->assertOk()->assertJsonCount(0, 'data');
});
