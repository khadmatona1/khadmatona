<?php

use App\Models\User;

beforeEach(fn () => $this->withHeader('Referer', config('app.url')));

test('a user can log in with correct credentials', function () {
    $user = User::factory()->create(['password' => 'Password123']);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'Password123',
    ]);

    $response->assertOk()->assertJsonPath('data.email', $user->email);
    $this->assertAuthenticatedAs($user);
});

test('login fails with incorrect credentials', function () {
    $user = User::factory()->create(['password' => 'Password123']);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('email');
    $this->assertGuest();
});

test('login is rate limited after too many attempts', function () {
    $user = User::factory()->create(['password' => 'Password123']);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(429);
});
