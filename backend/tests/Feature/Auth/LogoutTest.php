<?php

use App\Models\User;

beforeEach(fn () => $this->withHeader('Referer', config('app.url')));

test('an authenticated user can log out', function () {
    $user = User::factory()->create(['password' => 'Password123']);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'Password123',
    ])->assertOk();

    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertOk();

    // Assert against the 'web' guard explicitly: the preceding auth:sanctum
    // middleware call switches the app's *default* guard to 'sanctum' for
    // the rest of the (test) process via Auth::shouldUse() - a container-
    // singleton artifact of running multiple requests in one test process,
    // not something that happens across real, isolated HTTP requests.
    $this->assertGuest('web');
});

test('a guest cannot access the me endpoint', function () {
    $response = $this->getJson('/api/v1/auth/me');

    $response->assertStatus(401);
});

test('an authenticated user can fetch their own profile', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/auth/me');

    $response->assertOk()->assertJsonPath('data.email', $user->email);
});
