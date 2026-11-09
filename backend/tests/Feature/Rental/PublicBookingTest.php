<?php

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Rental\Domain\Models\BookingRequest;
use App\Modules\Rental\Domain\Models\ManagedProperty;
use App\Modules\Rental\Domain\Models\Reservation;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 9, 28)->setTime(12, 0));
    foreach (['Admin', 'Commercial'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = tap(User::factory()->create())->assignRole('Admin');
    $this->property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    $this->managed = ManagedProperty::create(['property_id' => $this->property->id, 'commission_rate_bp' => 2000]);
    $this->payload = [
        'property_id' => $this->property->id, 'request_key' => (string) Str::uuid(),
        'guest_name' => 'Booking Guest', 'guest_phone' => '+212612345678', 'guest_email' => 'guest@example.test',
        'guests_count' => 2, 'check_in_date' => '2026-10-05', 'check_out_date' => '2026-10-08',
        'consent' => true, 'notes' => 'Arrival in the evening',
    ];
    // Isolate rate-limit buckets between tests, retaining the real middleware.
    $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.'.random_int(1, 254)]);
});

afterEach(function () {
    $this->travelBack();
});

test('booking email is optional and confirmation skips email delivery when absent', function (string $variant) {
    Notification::fake();
    $payload = $this->payload;
    unset($payload['guest_email']);
    if ($variant !== 'omitted') {
        $payload['guest_email'] = $variant === 'blank' ? '' : null;
    }
    $this->postJson('/api/v1/rental/booking-requests', $payload)->assertCreated();
    $booking = BookingRequest::firstOrFail();
    expect($booking->guest_email)->toBeNull();
    $this->actingAs($this->admin)->patchJson('/api/v1/rental/booking-requests/'.$booking->id.'/confirm', ['total_amount' => 1000])->assertOk();
    expect(Reservation::firstOrFail()->guest_email)->toBeNull();
    Notification::assertNothingSent();
})->with(['omitted', 'blank', 'null']);

test('booking rejects an invalid email when supplied', function () {
    $this->postJson('/api/v1/rental/booking-requests', [...$this->payload, 'guest_email' => 'invalid'])
        ->assertUnprocessable()->assertJsonValidationErrors('guest_email');
});

test('a guest submits a pending request without creating revenue or exposing personal data', function () {
    $response = $this->postJson('/api/v1/rental/booking-requests', [
        ...$this->payload, 'status' => 'confirmed', 'total_amount' => 1, 'commission_rate_bp' => 0,
    ])->assertCreated()->assertJsonPath('data.status', 'received');
    expect(array_keys($response->json('data')))->toBe(['reference', 'status']);
    expect(BookingRequest::first()->status)->toBe('pending');
    expect(BookingRequest::first()->consented_at)->not->toBeNull();
    expect(Reservation::count())->toBe(0);
    $this->actingAs($this->admin)->getJson('/api/v1/rental/booking-requests?filter[status]=pending')
        ->assertOk()->assertJsonPath('data.0.guest_email', 'guest@example.test')->assertJsonMissingPath('data.0.request_key');
});

test('retries with the same key are idempotent and cannot replace guest details', function () {
    $reference = $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated()->json('data.reference');
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated()->assertJsonPath('data.reference', $reference);
    $this->postJson('/api/v1/rental/booking-requests', [...$this->payload, 'guest_email' => 'other@example.test'])
        ->assertUnprocessable()->assertJsonValidationErrors('request_key');
    expect(BookingRequest::count())->toBe(1);
});

test('the booking catalog and availability only expose active published rental properties', function () {
    $this->getJson('/api/v1/rental/booking-properties')->assertOk()->assertJsonPath('data.properties.0.id', $this->property->id);
    $this->getJson('/api/v1/rental/booking/'.$this->property->id)->assertOk()->assertExactJson(['success' => true, 'data' => ['bookable' => true, 'available' => null]]);
    $this->property->update(['approval_status' => 'pending_approval']);
    $this->getJson('/api/v1/rental/booking-properties')->assertOk()->assertJsonCount(0, 'data.properties');
    $this->getJson('/api/v1/rental/booking/'.$this->property->id)->assertNotFound();
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertNotFound();
    $this->property->update(['approval_status' => 'approved']);
    $this->managed->update(['is_active' => false]);
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertNotFound();
});

test('properties outside active management cannot be listed checked or booked', function (string $managementState) {
    if ($managementState === 'unmanaged') {
        $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    } else {
        $property = $this->property;
        if ($managementState === 'inactive') {
            $this->managed->update(['is_active' => false]);
        } else {
            $this->managed->delete();
        }
    }

    $catalog = $this->getJson('/api/v1/rental/booking-properties')->assertOk()->json('data.properties');
    expect(array_column($catalog, 'id'))->not->toContain($property->id);
    $this->getJson('/api/v1/rental/booking/'.$property->id)->assertNotFound();
    $this->postJson('/api/v1/rental/booking-requests', [...$this->payload, 'property_id' => $property->id])->assertNotFound();
    expect(BookingRequest::count())->toBe(0)->and(Reservation::count())->toBe(0);
})->with(['unmanaged', 'inactive', 'removed']);

test('a pending request cannot be confirmed after rental management is disabled', function () {
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $booking = BookingRequest::first();
    $this->managed->update(['is_active' => false]);

    $this->actingAs($this->admin)->patchJson('/api/v1/rental/booking-requests/'.$booking->id.'/confirm', ['total_amount' => 1000])
        ->assertUnprocessable()->assertJsonValidationErrors('property_id');
    expect($booking->fresh()->status)->toBe('pending')->and(Reservation::count())->toBe(0);
});

test('confirmation creates one direct reservation with an admin controlled total', function () {
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $id = BookingRequest::first()->id;
    $url = '/api/v1/rental/booking-requests/'.$id.'/confirm';
    $this->actingAs($this->admin)->patchJson($url, ['total_amount' => '1250.25'])->assertOk()->assertJsonPath('data.status', 'confirmed');
    $this->patchJson($url, ['total_amount' => '1250.25'])->assertOk();
    expect(Reservation::count())->toBe(1);
    $reservation = Reservation::first();
    expect($reservation->total_amount)->toBe(125025)->and($reservation->commission_rate_bp)->toBe(2000)
        ->and($reservation->channel->value)->toBe('direct')->and($reservation->guest_email)->toBe('guest@example.test');
});

test('approval rechecks overlaps and pending requests never block availability', function () {
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $this->postJson('/api/v1/rental/booking-requests', [...$this->payload, 'request_key' => (string) Str::uuid()])->assertCreated();
    $availability = '/api/v1/rental/booking/'.$this->property->id.'?check_in_date=2026-10-05&check_out_date=2026-10-08';
    $this->getJson($availability)->assertJsonPath('data.available', true);
    [$first, $second] = BookingRequest::orderBy('id')->get()->all();
    $this->actingAs($this->admin)->patchJson('/api/v1/rental/booking-requests/'.$first->id.'/confirm', ['total_amount' => 900])->assertOk();
    $this->getJson($availability)->assertJsonPath('data.available', false);
    $this->patchJson('/api/v1/rental/booking-requests/'.$second->id.'/confirm', ['total_amount' => 900])->assertUnprocessable();
    expect($second->fresh()->status)->toBe('pending')->and(Reservation::count())->toBe(1);
    $this->getJson('/api/v1/rental/booking/'.$this->property->id.'?check_in_date=2026-10-08&check_out_date=2026-10-10')
        ->assertJsonPath('data.available', true);
});

test('adjacent public stays can be submitted and confirmed', function (string $checkIn, string $checkOut) {
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $first = BookingRequest::first();
    $this->actingAs($this->admin)->patchJson('/api/v1/rental/booking-requests/'.$first->id.'/confirm', ['total_amount' => 900])->assertOk();

    $this->getJson('/api/v1/rental/booking/'.$this->property->id.'?'.http_build_query([
        'check_in_date' => $checkIn, 'check_out_date' => $checkOut,
    ]))->assertOk()->assertJsonPath('data.available', true);
    $this->postJson('/api/v1/rental/booking-requests', [
        ...$this->payload, 'request_key' => (string) Str::uuid(),
        'check_in_date' => $checkIn, 'check_out_date' => $checkOut,
    ])->assertCreated();
    $next = BookingRequest::whereKeyNot($first->id)->firstOrFail();
    $this->patchJson('/api/v1/rental/booking-requests/'.$next->id.'/confirm', ['total_amount' => 600])->assertOk();
    expect(Reservation::count())->toBe(2);
})->with([
    'arrival on previous departure' => ['2026-10-08', '2026-10-10'],
    'departure on next arrival' => ['2026-10-03', '2026-10-05'],
]);

test('senior commercials can confirm public booking requests', function () {
    Role::findOrCreate('SeniorCommercial');
    $senior = User::factory()->create()->assignRole('SeniorCommercial');
    $this->property->update(['commercial_id' => $senior->id]);
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $id = BookingRequest::first()->id;
    $this->actingAs($senior)->patchJson('/api/v1/rental/booking-requests/'.$id.'/confirm', ['total_amount' => 900])
        ->assertOk()->assertJsonPath('data.status', 'confirmed');
});

test('senior commercials cannot see or decide booking requests for another property', function () {
    Role::findOrCreate('SeniorCommercial');
    $senior = User::factory()->create()->assignRole('SeniorCommercial');
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $id = BookingRequest::first()->id;
    $this->actingAs($senior)->getJson('/api/v1/rental/booking-requests')->assertJsonCount(0, 'data');
    $this->patchJson('/api/v1/rental/booking-requests/'.$id.'/confirm', ['total_amount' => 900])->assertNotFound();
    $this->patchJson('/api/v1/rental/booking-requests/'.$id.'/reject')->assertNotFound();
    // The public booking catalog remains available regardless of the signed-in role.
    $this->getJson('/api/v1/rental/booking-properties')->assertOk();
});

test('guests and commercials cannot read or decide booking requests', function () {
    $this->postJson('/api/v1/rental/booking-requests', $this->payload)->assertCreated();
    $id = BookingRequest::first()->id;
    $this->getJson('/api/v1/rental/booking-requests')->assertUnauthorized();
    $this->patchJson('/api/v1/rental/booking-requests/'.$id.'/confirm', ['total_amount' => 10])->assertUnauthorized();
    $commercial = tap(User::factory()->create())->assignRole('Commercial');
    $this->actingAs($commercial)->getJson('/api/v1/rental/booking-requests')->assertOk()->assertJsonCount(0, 'data');
    $this->patchJson('/api/v1/rental/booking-requests/'.$id.'/reject')->assertNotFound();
    $this->actingAs($this->admin)->patchJson('/api/v1/rental/booking-requests/'.$id.'/reject')->assertOk();
    $this->patchJson('/api/v1/rental/booking-requests/'.$id.'/confirm', ['total_amount' => 10])->assertUnprocessable();
    expect(Reservation::count())->toBe(0);
});

test('invalid dates missing consent and bots are rejected', function () {
    foreach ([['check_in_date' => '2026-09-01'], ['check_out_date' => '2026-10-05'], ['consent' => false], ['website' => 'spam'], ['guest_phone' => 'abc']] as $override) {
        $this->postJson('/api/v1/rental/booking-requests', [...$this->payload, ...$override])->assertUnprocessable();
    }
    expect(BookingRequest::count())->toBe(0);
});
