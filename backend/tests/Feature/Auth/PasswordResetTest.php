<?php

use App\Core\Auth\Notifications\ResetPasswordNotification;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

beforeEach(fn () => $this->withHeader('Referer', config('app.url')));

test('a reset link is sent for a known email', function () {
    Notification::fake();
    $user = User::factory()->create();

    $response = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);

    $response->assertOk();
    Notification::assertSentTo($user, ResetPasswordNotification::class);
});

test('forgot password does not reveal whether an email is registered', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'unknown@example.test']);

    $response->assertOk();
});

test('a user can reset their password with a valid token', function () {
    $user = User::factory()->create();
    $token = Password::createToken($user);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'NewPassword123',
        'password_confirmation' => 'NewPassword123',
    ]);

    $response->assertOk();
    expect(Hash::check('NewPassword123', $user->fresh()->password))->toBeTrue();
});

test('resetting with an invalid token fails', function () {
    $user = User::factory()->create();

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'invalid-token',
        'email' => $user->email,
        'password' => 'NewPassword123',
        'password_confirmation' => 'NewPassword123',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('email');
});
