<?php

use App\Models\User;
use App\Modules\Settings\Database\Seeders\SettingsSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(SettingsSeeder::class);

    Role::findOrCreate('Admin');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
});

test('a guest can view settings resolved to the request locale', function () {
    $fr = $this->getJson('/api/v1/settings', ['Accept-Language' => 'fr']);
    $fr->assertOk()
        ->assertJsonPath('data.hero_title_accent', 'bien')
        ->assertJsonPath('data.contact_email', 'contact@khadmatona.ma');

    $en = $this->getJson('/api/v1/settings', ['Accept-Language' => 'en']);
    $en->assertOk()->assertJsonPath('data.hero_title_accent', 'property');

    $ar = $this->getJson('/api/v1/settings', ['Accept-Language' => 'ar']);
    $ar->assertOk()->assertJsonPath('data.hero_title_accent', 'العقار');
});

test('a guest cannot view or edit the admin settings endpoints', function () {
    $this->getJson('/api/v1/settings/edit')->assertUnauthorized();
    $this->putJson('/api/v1/settings', ['contact_email' => 'x@example.com'])->assertUnauthorized();
});

test('an authenticated user without the Admin role cannot edit settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/settings/edit')->assertForbidden();
    $this->actingAs($user)->putJson('/api/v1/settings', ['contact_email' => 'x@example.com'])->assertForbidden();
});

test('an admin can view the settings edit payload with all three locales', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/settings/edit');

    $response->assertOk()
        ->assertJsonPath('data.translations.hero_title_accent.fr', 'bien')
        ->assertJsonPath('data.translations.hero_title_accent.en', 'property')
        ->assertJsonPath('data.translations.hero_title_accent.ar', 'العقار')
        ->assertJsonPath('data.contact_email', 'contact@khadmatona.ma');
});

test('an admin can update a mix of plain and translated fields', function () {
    $response = $this->actingAs($this->admin)->putJson('/api/v1/settings', [
        'contact_phone' => '+212 6 11 22 33 44',
        'social_facebook' => 'https://facebook.com/newhandle',
        'translations' => [
            'fr' => ['hero_title_accent' => 'domicile'],
            'en' => ['hero_title_accent' => 'home'],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.contact_phone', '+212 6 11 22 33 44')
        ->assertJsonPath('data.translations.hero_title_accent.fr', 'domicile')
        ->assertJsonPath('data.translations.hero_title_accent.en', 'home')
        // Untouched locale/field values survive the partial update.
        ->assertJsonPath('data.translations.hero_title_accent.ar', 'العقار')
        ->assertJsonPath('data.social_instagram', 'https://instagram.com/khadmatona');

    $show = $this->getJson('/api/v1/settings', ['Accept-Language' => 'fr']);
    $show->assertJsonPath('data.hero_title_accent', 'domicile')
        ->assertJsonPath('data.contact_phone', '+212 6 11 22 33 44');
});
