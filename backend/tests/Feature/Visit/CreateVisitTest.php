<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Models\Visit;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    // Admin is the notify-fallback recipient for an ownerless property's
    // booking (CreateVisitAction::notifyCommercial) - needed even though no
    // test here asserts on that notification directly.
    Role::findOrCreate('Admin');
    Role::findOrCreate('SeniorCommercial');
    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('SeniorCommercial');
    $this->property = Property::factory()->create(['commercial_id' => $this->commercial->id]);

    // A weekday, 10:00 Morocco time (permanent UTC+1 in September - not the
    // Ramadan UTC+0 pause), a year out so the "after:now" rule never flakes.
    $this->validScheduledAt = '2027-09-23T09:00:00Z';
});

test('booking a visit creates both a Lead and a linked Visit', function () {
    $response = $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $this->property->id,
        'scheduled_at' => $this->validScheduledAt,
    ]);

    $response->assertStatus(201)->assertJsonPath('data.property_id', $this->property->id);

    $visit = Visit::latest()->first();
    expect($visit)->not->toBeNull();
    expect($visit->property_id)->toBe($this->property->id);
    expect($visit->commercial_id)->toBe($this->commercial->id);
    expect($visit->status->value)->toBe('scheduled');

    $lead = Lead::find($visit->lead_id);
    expect($lead)->not->toBeNull();
    expect($lead->type->value)->toBe('visit_request');
    expect($lead->name)->toBe('Test Visitor');
    expect($lead->phone)->toBe('+212612345678');
    expect($lead->commercial_id)->toBe($this->commercial->id);
});

test('visit email can be omitted or left blank', function (string $variant) {
    $payload = [
        'name' => 'Visitor without email',
        'phone' => '+212612345678',
        'property_id' => $this->property->id,
        'scheduled_at' => $this->validScheduledAt,
    ];
    if ($variant !== 'omitted') {
        $payload['email'] = $variant === 'blank' ? '' : null;
    }
    $this->postJson('/api/v1/visits', $payload)->assertCreated();
    expect(Lead::query()->sole()->email)->toBe('');
})->with(['omitted', 'blank', 'null']);

test('phone is required to book a visit', function () {
    $response = $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'property_id' => $this->property->id,
        'scheduled_at' => $this->validScheduledAt,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('phone');
    expect(Visit::count())->toBe(0);
});

test('property_id is required and must exist', function () {
    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'scheduled_at' => $this->validScheduledAt,
    ])->assertStatus(422)->assertJsonValidationErrors('property_id');

    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => 999_999,
        'scheduled_at' => $this->validScheduledAt,
    ])->assertStatus(422)->assertJsonValidationErrors('property_id');
});

test('a past scheduled_at is rejected', function () {
    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $this->property->id,
        'scheduled_at' => '2020-01-01T09:00:00Z',
    ])->assertStatus(422)->assertJsonValidationErrors('scheduled_at');
});

test('a scheduled_at outside business hours is rejected', function () {
    // 22:00 Morocco time.
    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $this->property->id,
        'scheduled_at' => '2027-09-23T21:00:00Z',
    ])->assertStatus(422)->assertJsonValidationErrors('scheduled_at');
});

test('a scheduled_at on a Sunday is rejected', function () {
    // 2027-09-26 is a Sunday.
    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $this->property->id,
        'scheduled_at' => '2027-09-26T10:00:00Z',
    ])->assertStatus(422)->assertJsonValidationErrors('scheduled_at');
});

test('a property with no owning commercial leaves both rows commercial_id null', function () {
    $ownerless = Property::factory()->create(['commercial_id' => null]);

    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor@example.com',
        'phone' => '+212612345678',
        'property_id' => $ownerless->id,
        'scheduled_at' => $this->validScheduledAt,
    ])->assertStatus(201);

    $visit = Visit::latest()->first();
    expect($visit->commercial_id)->toBeNull();
    expect(Lead::find($visit->lead_id)->commercial_id)->toBeNull();
});

test('the public visit booking endpoint is rate limited', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/visits', [
            'name' => 'Test Visitor',
            'email' => "visitor{$i}@example.com",
            'phone' => '+21261234'.str_pad((string) $i, 4, '0'),
            'property_id' => $this->property->id,
            'scheduled_at' => $this->validScheduledAt,
        ])->assertStatus(201);
    }

    $this->postJson('/api/v1/visits', [
        'name' => 'Test Visitor',
        'email' => 'visitor-over@example.com',
        'phone' => '+212612349999',
        'property_id' => $this->property->id,
        'scheduled_at' => $this->validScheduledAt,
    ])->assertStatus(429);
});
