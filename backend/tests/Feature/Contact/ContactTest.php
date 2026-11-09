<?php

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');

    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('Commercial');

    $this->otherCommercial = User::factory()->create();
    $this->otherCommercial->assignRole('Commercial');
});

test('a guest cannot list or manage contacts', function () {
    $contact = Contact::factory()->create();

    $this->getJson('/api/v1/contacts')->assertStatus(401);
    $this->getJson("/api/v1/contacts/{$contact->id}")->assertStatus(401);
    $this->postJson('/api/v1/contacts', [])->assertStatus(401);
    $this->putJson("/api/v1/contacts/{$contact->id}", [])->assertStatus(401);
    $this->deleteJson("/api/v1/contacts/{$contact->id}")->assertStatus(401);
});

test('an authenticated user without a recognized role cannot access contacts', function () {
    $plainUser = User::factory()->create();

    $this->actingAs($plainUser)->getJson('/api/v1/contacts')->assertStatus(403);
});

test('an admin sees every contact regardless of owner', function () {
    Contact::factory()->create(['commercial_id' => $this->commercial->id]);
    Contact::factory()->create(['commercial_id' => $this->otherCommercial->id]);
    Contact::factory()->create(['commercial_id' => null]);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/contacts');

    $response->assertOk()->assertJsonCount(3, 'data');
});

test('a commercial only sees their own contacts', function () {
    $own = Contact::factory()->create(['commercial_id' => $this->commercial->id]);
    Contact::factory()->create(['commercial_id' => $this->otherCommercial->id]);

    $response = $this->actingAs($this->commercial)->getJson('/api/v1/contacts');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $own->id);
});

test('a commercial creating a contact is always forced to own it, ignoring a hostile commercial_id', function () {
    $response = $this->actingAs($this->commercial)->postJson('/api/v1/contacts', [
        'type' => 'buyer',
        'name' => 'Hostile Override Attempt',
        'commercial_id' => $this->otherCommercial->id,
    ]);

    $response->assertCreated()->assertJsonPath('data.commercial_id', $this->commercial->id);
    $this->assertDatabaseHas('contacts', [
        'name' => 'Hostile Override Attempt',
        'commercial_id' => $this->commercial->id,
    ]);
});

test('an admin can assign a contact to any commercial', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/contacts', [
        'type' => 'seller',
        'name' => 'Admin Assigned Contact',
        'commercial_id' => $this->commercial->id,
    ]);

    $response->assertCreated()->assertJsonPath('data.commercial_id', $this->commercial->id);
});

test('a commercial cannot view, update, or delete another commercial\'s contact', function () {
    $contact = Contact::factory()->create(['commercial_id' => $this->otherCommercial->id]);

    $this->actingAs($this->commercial)->getJson("/api/v1/contacts/{$contact->id}")->assertStatus(403);
    $this->actingAs($this->commercial)->putJson("/api/v1/contacts/{$contact->id}", [
        'type' => 'buyer',
        'name' => 'Hijacked',
    ])->assertStatus(403);
    $this->actingAs($this->commercial)->deleteJson("/api/v1/contacts/{$contact->id}")->assertStatus(403);

    $this->assertDatabaseHas('contacts', ['id' => $contact->id, 'name' => $contact->name]);
});

test('a commercial can view, update, and delete their own contact', function () {
    $contact = Contact::factory()->create(['commercial_id' => $this->commercial->id]);

    $this->actingAs($this->commercial)->getJson("/api/v1/contacts/{$contact->id}")->assertOk();

    $this->actingAs($this->commercial)->putJson("/api/v1/contacts/{$contact->id}", [
        'type' => 'landlord',
        'name' => 'Updated Name',
    ])->assertOk()->assertJsonPath('data.name', 'Updated Name');

    $this->actingAs($this->commercial)->deleteJson("/api/v1/contacts/{$contact->id}")->assertOk();
    $this->assertSoftDeleted('contacts', ['id' => $contact->id]);
});

test('contacts can be filtered by type and searched by name', function () {
    Contact::factory()->create(['commercial_id' => $this->admin->id, 'type' => 'buyer', 'name' => 'Yasmine Buyer']);
    Contact::factory()->create(['commercial_id' => $this->admin->id, 'type' => 'seller', 'name' => 'Karim Seller']);

    $byType = $this->actingAs($this->admin)->getJson('/api/v1/contacts?filter[type]=seller');
    $byType->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.type', 'seller');

    $bySearch = $this->actingAs($this->admin)->getJson('/api/v1/contacts?filter[search]=Yasmine');
    $bySearch->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Yasmine Buyer');
});

test('creating a contact requires the mandatory fields', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/contacts', []);

    $response->assertStatus(422)->assertJsonValidationErrors(['type', 'name']);
});
