<?php

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Owner');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
});

test('an admin can create a user with role Owner linked to a landlord contact', function () {
    $contact = Contact::factory()->create(['type' => 'landlord']);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Test Owner',
        'email' => 'owner@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'Owner',
        'contact_id' => $contact->id,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.roles.0', 'Owner')
        ->assertJsonPath('data.contact_id', $contact->id);
});

test('contact_id is required when role is Owner', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Test Owner',
        'email' => 'owner@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'Owner',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['contact_id']);
});

test('contact_id must belong to a seller or landlord contact', function () {
    $contact = Contact::factory()->create(['type' => 'buyer']);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Test Owner',
        'email' => 'owner@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'Owner',
        'contact_id' => $contact->id,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['contact_id']);
});

test('contact_id is not required for non-Owner roles', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Test Admin',
        'email' => 'plainadmin@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'Admin',
    ]);

    $response->assertCreated();
});

test('a guest cannot list or create users', function () {
    $this->getJson('/api/v1/users')->assertStatus(401);
    $this->postJson('/api/v1/users', [])->assertStatus(401);
});

test('an authenticated user without the Admin role cannot list or create users', function () {
    $nonAdmin = User::factory()->create();

    $this->actingAs($nonAdmin)->getJson('/api/v1/users')->assertStatus(403);
    $this->actingAs($nonAdmin)->postJson('/api/v1/users', [])->assertStatus(403);
});

test('a role-authorization failure returns the standard API error envelope, not a raw exception', function () {
    $nonAdmin = User::factory()->create();

    $response = $this->actingAs($nonAdmin)->getJson('/api/v1/users');

    $response->assertStatus(403)->assertJson([
        'success' => false,
        'code' => 'forbidden',
    ])->assertJsonStructure(['success', 'message', 'errors', 'code']);
});

test('an admin can list users with their roles', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/users');

    $response->assertOk()
        ->assertJsonPath('data.0.email', $this->admin->email)
        ->assertJsonPath('data.0.roles.0', 'Admin');
});

test('an admin can create a user and assign a role', function () {
    $payload = [
        'name' => 'Nadia Fassi',
        'email' => 'nadia@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'Admin',
    ];

    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', $payload);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'nadia@example.com')
        ->assertJsonPath('data.roles.0', 'Admin');

    $this->assertDatabaseHas('users', ['email' => 'nadia@example.com']);
    expect(User::where('email', 'nadia@example.com')->first()->hasRole('Admin'))->toBeTrue();
});

test('creating a user rejects a duplicate email', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Duplicate',
        'email' => $this->admin->email,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'Admin',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['email']);
});

test('creating a user rejects an unknown role', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Test',
        'email' => 'test@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'SuperAdmin',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['role']);
});

test('an admin can list available roles', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/roles');

    // This file's own beforeEach seeds both Admin and Owner.
    $response->assertOk()->assertJsonFragment(['data' => ['Admin', 'Owner']]);
});

test('a guest cannot view, update, or delete a user', function () {
    $user = User::factory()->create();

    $this->getJson("/api/v1/users/{$user->id}")->assertStatus(401);
    $this->putJson("/api/v1/users/{$user->id}", [])->assertStatus(401);
    $this->deleteJson("/api/v1/users/{$user->id}")->assertStatus(401);
});

test('an authenticated user without the Admin role cannot view, update, or delete a user', function () {
    $nonAdmin = User::factory()->create();
    $target = User::factory()->create();

    $this->actingAs($nonAdmin)->getJson("/api/v1/users/{$target->id}")->assertStatus(403);
    $this->actingAs($nonAdmin)->putJson("/api/v1/users/{$target->id}", [])->assertStatus(403);
    $this->actingAs($nonAdmin)->deleteJson("/api/v1/users/{$target->id}")->assertStatus(403);
});

test('an admin can view a single user', function () {
    $target = User::factory()->create(['name' => 'Nadia Fassi']);
    $target->assignRole('Admin');

    $response = $this->actingAs($this->admin)->getJson("/api/v1/users/{$target->id}");

    $response->assertOk()
        ->assertJsonPath('data.name', 'Nadia Fassi')
        ->assertJsonPath('data.roles.0', 'Admin');
});

test('an admin can update a user without changing the password', function () {
    $target = User::factory()->create(['name' => 'Old Name', 'email' => 'old@example.com']);
    $target->assignRole('Admin');
    $originalHash = $target->password;

    $response = $this->actingAs($this->admin)->putJson("/api/v1/users/{$target->id}", [
        'name' => 'New Name',
        'email' => 'new@example.com',
        'password' => '',
        'password_confirmation' => '',
        'role' => 'Admin',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.email', 'new@example.com');

    expect($target->fresh()->password)->toBe($originalHash);
});

test('an admin can update a user\'s password', function () {
    $target = User::factory()->create();
    $target->assignRole('Admin');
    $originalHash = $target->password;

    $response = $this->actingAs($this->admin)->putJson("/api/v1/users/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
        'role' => 'Admin',
    ]);

    $response->assertOk();
    expect($target->fresh()->password)->not->toBe($originalHash);
});

test('updating a user rejects an email already used by someone else', function () {
    $other = User::factory()->create(['email' => 'taken@example.com']);
    $target = User::factory()->create();

    $response = $this->actingAs($this->admin)->putJson("/api/v1/users/{$target->id}", [
        'name' => $target->name,
        'email' => 'taken@example.com',
        'role' => 'Admin',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    expect($other)->not->toBeNull();
});

test('updating a user keeps its own email valid', function () {
    $target = User::factory()->create(['email' => 'self@example.com']);
    $target->assignRole('Admin');

    $response = $this->actingAs($this->admin)->putJson("/api/v1/users/{$target->id}", [
        'name' => 'Renamed',
        'email' => 'self@example.com',
        'role' => 'Admin',
    ]);

    $response->assertOk()->assertJsonPath('data.email', 'self@example.com');
});

test('an admin can delete another user', function () {
    $target = User::factory()->create();

    $response = $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$target->id}");

    $response->assertOk();
    $this->assertDatabaseMissing('users', ['id' => $target->id]);
});

test('an admin cannot delete their own account', function () {
    $response = $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$this->admin->id}");

    $response->assertStatus(422)->assertJson(['code' => 'cannot_delete_self']);
    $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
});
