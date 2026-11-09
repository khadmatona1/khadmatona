<?php

use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Storage::fake('media');
    config(['media-library.disk_name' => 'media']);
});

function registrationPayload(array $photos): array
{
    return [
        'type' => 'sell_request',
        'name' => 'Property Owner',
        'email' => 'owner@example.com',
        'phone' => '+212612345678',
        'city' => 'Marrakech',
        'district' => 'Gueliz',
        'address' => '12 Rue de Marrakech',
        'property_details' => ['price' => '950000', 'surface' => '85'],
        'photos' => $photos,
    ];
}

test('a property registration saves photos and exposes them only in the authorized lead detail', function () {
    $response = $this->post('/api/v1/leads', registrationPayload([
        UploadedFile::fake()->image('property.jpg'),
        UploadedFile::fake()->image('room.png'),
    ]), ['Accept' => 'application/json']);

    $response->assertCreated()->assertJsonMissingPath('data.photos');
    $lead = Lead::findOrFail($response->json('data.id'));
    expect($lead->getMedia('photos'))->toHaveCount(2);
    expect($lead->property_details['price'])->toBe('950000');
    foreach ($lead->getMedia('photos') as $photo) {
        Storage::disk('media')->assertExists($photo->getPathRelativeToRoot());
    }

    $this->getJson('/api/v1/leads/'.$lead->id)->assertUnauthorized();

    Role::findOrCreate('Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');
    $this->actingAs($admin)->getJson('/api/v1/leads/'.$lead->id)
        ->assertOk()->assertJsonCount(2, 'data.photos')
        ->assertJsonStructure(['data' => ['photos' => [['id', 'url']]]]);
});

test('registration rejects non-image uploads without saving the lead', function () {
    $this->post('/api/v1/leads', registrationPayload([
        UploadedFile::fake()->create('document.pdf', 10, 'application/pdf'),
    ]), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('photos.0');
    $this->assertDatabaseMissing('leads', ['email' => 'owner@example.com']);
});

test('registration limits both individual and aggregate photo sizes', function () {
    $this->post('/api/v1/leads', registrationPayload([
        UploadedFile::fake()->image('large.jpg')->size(2049),
    ]), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('photos.0');

    $this->post('/api/v1/leads', registrationPayload([
        UploadedFile::fake()->image('first.jpg')->size(1700),
        UploadedFile::fake()->image('second.jpg')->size(1700),
    ]), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('photos');
});

test('registration rejects more than ten photos', function () {
    $photos = array_map(fn ($i) => UploadedFile::fake()->image("photo-$i.jpg"), range(1, 11));
    $this->post('/api/v1/leads', registrationPayload($photos), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('photos');
});
