<?php

use App\Modules\Lead\Domain\Models\Lead;

test('property registration accepts a phone contact without an email', function (string $type) {
    $this->postJson('/api/v1/leads', ['type' => $type, 'name' => 'Visitor', 'phone' => '0612345678', 'address' => 'Gueliz'])
        ->assertCreated();
    expect(Lead::query()->sole()->email)->toBe('');
})->with(['sell_request', 'rent_request', 'buy_request', 'contact']);

test('contact requests need a phone when email is absent and reject invalid email addresses', function () {
    $this->postJson('/api/v1/leads', ['type' => 'contact', 'name' => 'Visitor'])
        ->assertUnprocessable()->assertJsonValidationErrors('phone');
    $this->postJson('/api/v1/leads', ['type' => 'buy_request', 'name' => 'Visitor', 'email' => 'invalid'])
        ->assertUnprocessable()->assertJsonValidationErrors('email');
});

test('registration cannot omit both contact channels', function () {
    $this->postJson('/api/v1/leads', ['type' => 'buy_request', 'name' => 'Visitor'])
        ->assertUnprocessable()->assertJsonValidationErrors('phone');
});

test('registration accepts international phone lengths and country prefixes', function (string $phone) {
    $this->postJson('/api/v1/leads', ['type' => 'sell_request', 'name' => 'Visitor', 'phone' => $phone])
        ->assertCreated();
})->with(['+191817492015', '+14155552671', '+33612345678', '0033612345678', '+212612345678']);

test('registration rejects malformed international phone numbers', function (string $phone) {
    $this->postJson('/api/v1/leads', ['type' => 'buy_request', 'name' => 'Visitor', 'phone' => $phone])
        ->assertUnprocessable()->assertJsonValidationErrors('phone');
})->with(['+0123456789', '+123', '+1234567890123456', '+33invalid']);
