<?php

use App\Models\User;

// Sanctum only starts a session for requests that look like they came from
// a configured stateful frontend (Referer/Origin match) - simulate that the
// same way the real SPA would.
beforeEach(fn () => $this->withHeader('Referer', config('app.url')));

test('a user can register with valid data', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Yasmine El Amrani',
        'email' => 'yasmine@example.test',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.email', 'yasmine@example.test');

    expect(User::where('email', 'yasmine@example.test')->exists())->toBeTrue();
    $this->assertAuthenticated();
});

test('registration requires a unique email', function () {
    User::factory()->create(['email' => 'taken@example.test']);

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Someone Else',
        'email' => 'taken@example.test',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('email');
});

test('registration requires a matching password confirmation', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Someone',
        'email' => 'someone@example.test',
        'password' => 'Password123',
        'password_confirmation' => 'Different123',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('password');
});
