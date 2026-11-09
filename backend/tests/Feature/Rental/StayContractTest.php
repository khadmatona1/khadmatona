<?php

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Rental\Domain\Models\BookingRequest;
use App\Modules\Rental\Domain\Models\ManagedProperty;
use App\Modules\Rental\Domain\Models\StayContract;
use App\Modules\Rental\Notifications\StayContractReady;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 9, 29)->setTime(12, 0));
    Role::findOrCreate('Admin');
    $this->admin = tap(User::factory()->create())->assignRole('Admin');
    $this->property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    ManagedProperty::create(['property_id' => $this->property->id, 'commission_rate_bp' => 2000]);
    Notification::fake();
    Storage::fake('local');

    $this->postJson('/api/v1/rental/booking-requests', [
        'property_id' => $this->property->id,
        'request_key' => (string) Str::uuid(),
        'guest_name' => 'Contract Guest',
        'guest_phone' => '+212612345678',
        'guest_email' => 'contract@example.test',
        'guests_count' => 2,
        'check_in_date' => '2026-10-10',
        'check_out_date' => '2026-10-13',
        'consent' => true,
    ])->assertCreated();

    $booking = BookingRequest::firstOrFail();
    $this->actingAs($this->admin)
        ->patchJson('/api/v1/rental/booking-requests/'.$booking->id.'/confirm', ['total_amount' => '1500.50'])
        ->assertOk();
});

afterEach(function () {
    $this->travelBack();
});

test('confirmation creates a secure contract and emails its link once', function () {
    $contract = StayContract::firstOrFail();

    expect($contract->access_token)->toHaveLength(64)
        ->and($contract->access_token_hash)->toBe(hash('sha256', $contract->access_token))
        ->and($contract->signed_at)->toBeNull();
    Notification::assertSentOnDemand(StayContractReady::class);

    $booking = BookingRequest::firstOrFail();
    $this->patchJson('/api/v1/rental/booking-requests/'.$booking->id.'/confirm', ['total_amount' => '1500.50'])->assertOk();
    expect(StayContract::count())->toBe(1);
    Notification::assertSentOnDemandTimes(StayContractReady::class, 1);
});

test('guest opens signs and revisits the generated contract', function () {
    $contract = StayContract::firstOrFail();
    $url = '/api/v1/rental/stay-contracts/'.$contract->access_token;

    $this->getJson($url)->assertOk()
        ->assertJsonPath('data.status', 'pending_signature')
        ->assertJsonPath('data.guest.email', 'contract@example.test')
        ->assertJsonPath('data.stay.total_amount', 1500.5);

    $signature = 'data:image/png;base64,'.base64_encode("\x89PNG\r\n\x1a\ncontract-signature");
    $this->post($url.'/sign', [
        'nationality' => 'Marocaine',
        'identity_number' => 'AB123456',
        'birth_date' => '1990-05-04',
        'address' => 'Marrakech, Maroc',
        'estimated_arrival_time' => '18:30',
        'identity_document' => UploadedFile::fake()->image('identity.jpg'),
        'signature' => $signature,
        'accept_terms' => '1',
    ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.status', 'signed');

    $contract->refresh();
    expect($contract->signed_at)->not->toBeNull()
        ->and($contract->contract_snapshot['client']['identity_number'])->toBe('AB123456');
    Storage::disk('local')->assertExists($contract->identity_document_path);
    Storage::disk('local')->assertExists($contract->signature_path);

    $this->getJson($url)->assertOk()
        ->assertJsonPath('data.status', 'signed')
        ->assertJsonPath('data.contract.identity_number', 'AB123456');
});

test('contract links do not expose records for a wrong token', function () {
    $this->getJson('/api/v1/rental/stay-contracts/'.Str::random(64))->assertNotFound();
});
