<?php

use App\Core\Lookup\Domain\Models\City;
use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    // Media Library writes real files even under RefreshDatabase (only DB
    // rows roll back, not disk writes) - without faking this disk, every
    // test run would hit the real Cloudinary account (config/media-library.php's
    // disk_name, MEDIA_DISK=cloudinary in .env).
    Storage::fake('cloudinary');

    Role::findOrCreate('Admin');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->city = City::factory()->withName('Marrakech')->create();
});

test('an admin can upload gallery images when creating a property', function () {
    $payload = [
        'title' => 'Villa avec galerie',
        'type' => 'villa',
        'status' => 'disponible',
        'city_id' => $this->city->id,
        'address' => 'Route de l\'Ourika',
        'price' => 3_500_000,
        'surface' => 320,
        'images' => [
            UploadedFile::fake()->image('salon.jpg'),
            UploadedFile::fake()->image('facade.jpg'),
        ],
    ];

    $response = $this->actingAs($this->admin)->post('/api/v1/properties', $payload);

    $response->assertCreated();
    $propertyId = $response->json('data.id');

    $show = $this->actingAs($this->admin)->getJson("/api/v1/properties/{$propertyId}");
    $show->assertOk()
        ->assertJsonCount(2, 'data.images')
        ->assertJsonPath('data.cover_image', fn ($url) => is_string($url) && $url !== '');
});

test('an admin can delete a single gallery image without affecting the others', function () {
    $property = Property::factory()->create(['city_id' => $this->city->id]);
    $property->addMedia(UploadedFile::fake()->image('one.jpg'))->toMediaCollection('gallery');
    $property->addMedia(UploadedFile::fake()->image('two.jpg'))->toMediaCollection('gallery');
    $deletedMedia = $property->getMedia('gallery')->first();
    $deletedPath = $deletedMedia->getPathRelativeToRoot();
    $remainingPath = $property->getMedia('gallery')->last()->getPathRelativeToRoot();

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/v1/properties/{$property->id}/images/{$deletedMedia->id}");

    $response->assertOk();
    expect($property->fresh()->getMedia('gallery'))->toHaveCount(1);

    // Regression guard for App\Core\Media\CloudinaryFileRemover: the real
    // Cloudinary Flysystem adapter's directory-listing-based delete
    // (Spatie's default) silently no-ops because listContents() reports
    // public_ids without their file extension, which never matches
    // $media->file_name - the file is never actually removed. This
    // asserts the file is gone from disk, not just the DB row.
    Storage::disk('cloudinary')->assertMissing($deletedPath);
    Storage::disk('cloudinary')->assertExists($remainingPath);
});

test('uploading a non-image file is rejected', function () {
    $response = $this->actingAs($this->admin)->post('/api/v1/properties', [
        'title' => 'Test',
        'type' => 'villa',
        'city_id' => $this->city->id,
        'address' => 'Test',
        'price' => 1_000_000,
        'surface' => 100,
        'images' => [UploadedFile::fake()->create('document.pdf', 100)],
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['images.0']);
});
