<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    // created_at is stored in UTC. Morocco is UTC+1 in September.
    $this->leadAt = function (string $utc, array $overrides = []): Lead {
        $lead = Lead::create(array_merge([
            'type' => 'contact',
            'status' => 'new',
            'name' => 'Lead '.$utc,
            'email' => 'lead@example.com',
        ], $overrides));
        Lead::whereKey($lead->id)->update(['created_at' => Carbon::parse($utc, 'UTC')]);

        return $lead;
    };
});

test('leads can be filtered by a received-date range', function () {
    ($this->leadAt)('2026-09-01 10:00:00');
    $inside = ($this->leadAt)('2026-09-10 10:00:00');
    ($this->leadAt)('2026-09-20 10:00:00');

    $this->actingAs($this->admin)
        ->getJson('/api/v1/leads?filter[created_from]=2026-09-05&filter[created_to]=2026-09-15')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $inside->id);
});

test('both bounds are inclusive whole days and can be used alone', function () {
    ($this->leadAt)('2026-09-05 08:00:00');
    ($this->leadAt)('2026-09-15 20:00:00');
    ($this->leadAt)('2026-09-16 08:00:00');

    $this->actingAs($this->admin)->getJson('/api/v1/leads?filter[created_from]=2026-09-05&filter[created_to]=2026-09-15')
        ->assertOk()->assertJsonCount(2, 'data');

    $this->actingAs($this->admin)->getJson('/api/v1/leads?filter[created_from]=2026-09-16')
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($this->admin)->getJson('/api/v1/leads?filter[created_to]=2026-09-05')
        ->assertOk()->assertJsonCount(1, 'data');
});

test('days follow Morocco on GMT by default', function () {
    // Default business timezone is UTC: 23:30 GMT on the 23rd is the 23rd.
    $lead = ($this->leadAt)('2026-09-23 23:30:00');

    $this->actingAs($this->admin)->getJson('/api/v1/leads?filter[created_from]=2026-09-23&filter[created_to]=2026-09-23')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $lead->id);

    $this->actingAs($this->admin)->getJson('/api/v1/leads?filter[created_from]=2026-09-24&filter[created_to]=2026-09-24')
        ->assertOk()->assertJsonCount(0, 'data');
});

test('days follow the configured business timezone when switched back to UTC+1', function () {
    config(['app.business_timezone' => 'Africa/Casablanca']);
    // 23:30 UTC on the 23rd is 00:30 on the 24th under Africa/Casablanca.
    $lead = ($this->leadAt)('2026-09-23 23:30:00');

    $this->actingAs($this->admin)->getJson('/api/v1/leads?filter[created_from]=2026-09-24&filter[created_to]=2026-09-24')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $lead->id);
});

test('the date filter combines with type, status and search', function () {
    ($this->leadAt)('2026-09-10 10:00:00', ['type' => 'sell_request', 'name' => 'Yasmine']);
    ($this->leadAt)('2026-09-10 11:00:00', ['type' => 'contact', 'name' => 'Yasmine']);
    ($this->leadAt)('2026-08-10 10:00:00', ['type' => 'sell_request', 'name' => 'Yasmine']);

    $this->actingAs($this->admin)
        ->getJson('/api/v1/leads?filter[type]=sell_request&filter[search]=Yasmine&filter[created_from]=2026-09-01')
        ->assertOk()->assertJsonCount(1, 'data');
});

test('a Commercial still only sees their own leads when filtering by date', function () {
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');
    $own = ($this->leadAt)('2026-09-10 10:00:00', ['commercial_id' => $commercial->id]);
    ($this->leadAt)('2026-09-10 10:00:00');

    $this->actingAs($commercial)->getJson('/api/v1/leads?filter[created_from]=2026-09-01&filter[created_to]=2026-09-30')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own->id);
});

test('invalid dates are rejected', function (string $value) {
    $this->actingAs($this->admin)->getJson("/api/v1/leads?filter[created_from]={$value}")
        ->assertStatus(422);
})->with(['24/09/2026', '2026-02-31', 'yesterday', '2026-9-1']);
