<?php

use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;

test('transaction criteria are saved and distinguish otherwise identical subscriptions', function () {
    $payload = ['phone' => '+212612345678', 'transaction_type' => 'rent', 'price_period' => 'month'];
    $first = $this->postJson('/api/v1/property-alerts', $payload)
        ->assertCreated()->assertJsonPath('data.transaction_type', 'rent')->assertJsonPath('data.price_period', 'month');
    $this->postJson('/api/v1/property-alerts', $payload)
        ->assertOk()->assertJsonPath('data.id', $first->json('data.id'));
    $this->postJson('/api/v1/property-alerts', [...$payload, 'price_period' => 'night'])->assertCreated();
    expect(PropertyAlert::count())->toBe(2);
});

test('a guest can create a property alert with just a phone', function () {
    $response = $this->postJson('/api/v1/property-alerts', ['phone' => '+212612345678']);

    $response->assertStatus(201)
        ->assertJsonPath('data.phone', '+212612345678')
        ->assertJsonPath('meta.already_existed', false);
    $this->assertDatabaseHas('property_alerts', ['phone_e164' => '+212612345678']);
});

test('email is accepted but not required', function () {
    $this->postJson('/api/v1/property-alerts', [
        'phone' => '0612345678',
        'email' => 'visitor@example.com',
    ])->assertStatus(201)->assertJsonPath('data.email', 'visitor@example.com');
});

test('phone is required to create an alert', function () {
    $response = $this->postJson('/api/v1/property-alerts', ['email' => 'visitor@example.com']);

    $response->assertStatus(422)->assertJsonValidationErrors('phone');
    expect(PropertyAlert::count())->toBe(0);
});

test('a malformed phone is rejected', function () {
    $this->postJson('/api/v1/property-alerts', ['phone' => 'not-a-phone'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('phone');
});

test('resubmitting the same phone and criteria returns the existing alert instead of creating a duplicate', function () {
    $payload = ['phone' => '+212612345678', 'city_id' => null, 'surface_min' => 80];

    $first = $this->postJson('/api/v1/property-alerts', $payload);
    $first->assertStatus(201)->assertJsonPath('meta.already_existed', false);
    $firstId = $first->json('data.id');

    $second = $this->postJson('/api/v1/property-alerts', $payload);
    $second->assertStatus(200)
        ->assertJsonPath('meta.already_existed', true)
        ->assertJsonPath('data.id', $firstId);

    expect(PropertyAlert::count())->toBe(1);
});

test('the same phone with different criteria creates a second, distinct alert', function () {
    $this->postJson('/api/v1/property-alerts', ['phone' => '+212612345678', 'surface_min' => 80])
        ->assertStatus(201);
    $this->postJson('/api/v1/property-alerts', ['phone' => '+212612345678', 'surface_min' => 150])
        ->assertStatus(201);

    expect(PropertyAlert::count())->toBe(2);
});

test('the public alert endpoint is rate limited', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/property-alerts', ['phone' => '+21261234'.str_pad((string) $i, 4, '0')])
            ->assertStatus(201);
    }

    $this->postJson('/api/v1/property-alerts', ['phone' => '+212612349999'])
        ->assertStatus(429);
});
