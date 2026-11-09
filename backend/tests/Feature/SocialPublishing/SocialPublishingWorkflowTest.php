<?php

use App\Core\Lookup\Domain\Models\City;
use App\Models\User;
use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\SocialPublishing\Application\Jobs\PublishPropertyToSocialJob;
use App\Modules\SocialPublishing\Application\SocialPublishingService;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialPropertyPreference;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use App\Modules\SocialPublishing\Domain\Models\SocialSetting;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\Support\SocialPublishingTestHelpers as Social;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    Role::findOrCreate('SeniorCommercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('Commercial');
    $this->city = City::factory()->withName('Marrakech')->create();
    Queue::fake([PublishPropertyToSocialJob::class]);
});

function listingPayload(City $city, array $overrides = []): array
{
    return [
        'title' => 'Villa test', 'type' => 'villa', 'status' => 'disponible', 'city_id' => $city->id,
        'address' => 'Test', 'price' => 1_000_000, 'surface' => 200, 'bedrooms' => 3, 'bathrooms' => 2,
        ...$overrides,
    ];
}

test('out of the box nothing is ever auto-published', function () {
    Social::connectAccounts();

    $this->actingAs($this->admin)->postJson('/api/v1/properties', listingPayload($this->city))->assertCreated();

    Queue::assertNothingPushed();
    expect(SocialPublication::count())->toBe(0);
});

test('a new listing is auto-published to both platforms once opted in', function () {
    Social::settings();
    Social::connectAccounts();

    $this->actingAs($this->admin)->postJson('/api/v1/properties', listingPayload($this->city))->assertCreated();

    Queue::assertPushed(PublishPropertyToSocialJob::class, 2);
    expect(SocialPublication::pluck('platform')->map->value->sort()->values()->all())->toBe(['facebook', 'instagram']);
});

test('a listing created by an Admin honours the choices sent with the form', function () {
    Social::settings();
    Social::connectAccounts();

    $this->actingAs($this->admin)->postJson('/api/v1/properties', listingPayload($this->city, [
        'social' => ['facebook' => true, 'instagram' => false, 'mode' => 'auto'],
    ]))->assertCreated();

    Queue::assertPushed(PublishPropertyToSocialJob::class, 1);
    expect(SocialPublication::sole()->platform->value)->toBe('facebook');
});

test('manual mode on a listing queues nothing', function () {
    Social::settings();
    Social::connectAccounts();

    $this->actingAs($this->admin)->postJson('/api/v1/properties', listingPayload($this->city, [
        'social' => ['facebook' => true, 'instagram' => true, 'mode' => 'manual'],
    ]))->assertCreated();

    Queue::assertNothingPushed();
});

test('a Commercial cannot set social choices through the listing form', function () {
    $this->actingAs($this->commercial)->postJson('/api/v1/properties', listingPayload($this->city, [
        'social' => ['facebook' => true, 'instagram' => true, 'mode' => 'auto'],
    ]))->assertCreated();

    expect(SocialPropertyPreference::count())->toBe(0);
});

test('a platform switched off in settings is skipped while the other still posts', function () {
    Social::settings(['instagram_enabled' => false]);
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);

    PropertyApproved::dispatch($property->id);

    expect(SocialPublication::sole()->platform->value)->toBe('facebook');
});

test('a platform without a connected account is skipped', function () {
    Social::settings();
    Social::connectAccounts();
    SocialAccount::where('platform', 'instagram')->delete();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);

    PropertyApproved::dispatch($property->id);

    expect(SocialPublication::sole()->platform->value)->toBe('facebook');
});

test('a pending listing is never published', function () {
    Social::settings();
    Social::connectAccounts();

    $this->actingAs($this->commercial)->postJson('/api/v1/properties', listingPayload($this->city))->assertCreated();

    Queue::assertNothingPushed();
});

test('approving a pending listing publishes it', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'pending_approval', 'status' => 'disponible']);

    $this->actingAs($this->admin)->patchJson("/api/v1/properties/{$property->id}/approve")->assertOk();

    Queue::assertPushed(PublishPropertyToSocialJob::class, 2);
});

test('an approved listing that is not available is not published', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'pending_approval', 'status' => 'vendu']);

    $this->actingAs($this->admin)->patchJson("/api/v1/properties/{$property->id}/approve")->assertOk();

    Queue::assertNothingPushed();
});

test('editing and re-approving a listing never reposts it', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);

    PropertyApproved::dispatch($property->id);
    PropertyApproved::dispatch($property->id);
    PropertyApproved::dispatch($property->id);

    Queue::assertPushed(PublishPropertyToSocialJob::class, 2);
    expect(SocialPublication::count())->toBe(2);
});

test('a no-op edit fires nothing', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible', 'city_id' => $this->city->id]);

    $this->actingAs($this->admin)->putJson("/api/v1/properties/{$property->id}", listingPayload($this->city))->assertOk();

    Queue::assertNothingPushed();
});

test('a failed auto post is not retried by a later re-approval', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    SocialPublication::create(['property_id' => $property->id, 'platform' => 'facebook', 'status' => 'failed']);
    SocialPublication::create(['property_id' => $property->id, 'platform' => 'instagram', 'status' => 'failed']);

    PropertyApproved::dispatch($property->id);

    Queue::assertNothingPushed();
});

test('existing listings are not published by default auto mode', function () {
    Social::settings(['auto_enabled_at' => now()]);
    Social::connectAccounts();
    $property = Property::factory()->create([
        'approval_status' => 'approved', 'status' => 'disponible', 'created_at' => now()->subYear(),
    ]);

    PropertyApproved::dispatch($property->id);

    Queue::assertNothingPushed();
});

test('running migrations publishes nothing', function () {
    Social::settings();
    Social::connectAccounts();
    Property::factory()->count(3)->create(['approval_status' => 'approved', 'status' => 'disponible']);

    Artisan::call('migrate');

    Queue::assertNothingPushed();
    expect(SocialPublication::count())->toBe(0);
});

test('a publishing failure never breaks property creation', function () {
    Social::settings();
    Social::connectAccounts();
    $this->mock(SocialPublishingService::class, fn ($mock) => $mock->shouldReceive('publishAutomatically')->andThrow(new RuntimeException('redis is down')));

    $this->actingAs($this->admin)->postJson('/api/v1/properties', listingPayload($this->city))->assertCreated();

    expect(Property::where('title', 'Villa test')->exists())->toBeTrue();
});

test('Publish Now queues the chosen platforms only', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/social/properties/{$property->id}/publish", ['platforms' => ['instagram']])
        ->assertStatus(202)
        ->assertJsonPath('data.publications.0.platform', 'instagram');

    Queue::assertPushed(PublishPropertyToSocialJob::class, 1);
});

test('Publish Now refuses an unpublished listing', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'pending_approval']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/social/properties/{$property->id}/publish", ['platforms' => ['facebook']])
        ->assertStatus(409)
        ->assertJsonPath('code', 'property_not_public');
});

test('Publish Now explains missing credentials and disabled platforms', function () {
    Social::settings(['instagram_enabled' => false]);
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    $this->actingAs($this->admin);

    $this->postJson("/api/v1/social/properties/{$property->id}/publish", ['platforms' => ['facebook']])
        ->assertStatus(409)->assertJsonPath('code', 'account_not_connected');
    $this->postJson("/api/v1/social/properties/{$property->id}/publish", ['platforms' => ['instagram']])
        ->assertStatus(409)->assertJsonPath('code', 'platform_disabled');
});

test('Publish Now cannot repost a published listing', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    SocialPublication::create(['property_id' => $property->id, 'platform' => 'facebook', 'status' => 'published']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/social/properties/{$property->id}/publish", ['platforms' => ['facebook']])
        ->assertStatus(409)->assertJsonPath('code', 'already_published');

    Queue::assertNothingPushed();
});

test('retry requeues a failed publication and only a failed one', function () {
    Social::settings();
    Social::connectAccounts();
    $property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    $failed = SocialPublication::create(['property_id' => $property->id, 'platform' => 'facebook', 'status' => 'failed', 'error_code' => 'outcome_unknown', 'error_message' => 'x', 'commit_started_at' => now()]);
    $published = SocialPublication::create(['property_id' => $property->id, 'platform' => 'instagram', 'status' => 'published']);
    $this->actingAs($this->admin);

    $this->postJson("/api/v1/social/publications/{$failed->id}/retry")->assertStatus(202);
    expect($failed->fresh())->status->value->toBe('pending')->error_code->toBeNull()->commit_started_at->toBeNull();
    Queue::assertPushed(PublishPropertyToSocialJob::class, 1);

    $this->postJson("/api/v1/social/publications/{$published->id}/retry")->assertStatus(409);
});

test('every social endpoint is Admin-only', function (string $method, string $uri) {
    $property = Property::factory()->create();
    $publication = SocialPublication::create(['property_id' => $property->id, 'platform' => 'facebook', 'status' => 'failed']);
    $uri = str_replace(['{id}', '{publication}'], [$property->id, $publication->id], $uri);

    $this->json($method, $uri)->assertStatus(401);
    $this->actingAs($this->commercial)->json($method, $uri)->assertStatus(403);
})->with([
    ['GET', '/api/v1/social/settings'],
    ['PUT', '/api/v1/social/settings'],
    ['POST', '/api/v1/social/connection/authorize'],
    ['POST', '/api/v1/social/connection/callback'],
    ['POST', '/api/v1/social/connection/page'],
    ['POST', '/api/v1/social/connection/verify'],
    ['DELETE', '/api/v1/social/connection'],
    ['GET', '/api/v1/social/properties/{id}'],
    ['PUT', '/api/v1/social/properties/{id}/preferences'],
    ['POST', '/api/v1/social/properties/{id}/publish'],
    ['POST', '/api/v1/social/publications/{publication}/retry'],
]);

test('preferences are saved per property and returned with a caption preview', function () {
    Social::settings();
    $property = Property::factory()->create(['city_id' => $this->city->id]);

    $this->actingAs($this->admin)
        ->putJson("/api/v1/social/properties/{$property->id}/preferences", ['facebook' => true, 'instagram' => false, 'mode' => 'manual'])
        ->assertOk()
        ->assertJsonPath('data.preferences.instagram', false)
        ->assertJsonPath('data.preferences.mode', 'manual');

    expect($this->getJson("/api/v1/social/properties/{$property->id}")->json('data.caption_preview'))->toContain('MARRAKECH');
});

test('an unknown property is a 404', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/social/properties/999999')->assertNotFound();
});

test('settings never expose tokens and stamp auto mode only on the off-to-on transition', function () {
    Social::connectAccounts();
    $this->actingAs($this->admin);

    $body = $this->getJson('/api/v1/social/settings')->assertOk();
    expect($body->getContent())->not->toContain('page-token');
    $body->assertJsonPath('data.accounts.facebook.name', 'Khadmatona')->assertJsonPath('data.settings.default_mode', 'manual');

    $payload = [
        'facebook_enabled' => true, 'instagram_enabled' => true, 'default_facebook' => true, 'default_instagram' => true,
        'default_mode' => 'auto', 'caption_template' => null, 'facebook_max_images' => 5, 'instagram_max_images' => 10,
    ];

    $this->putJson('/api/v1/social/settings', $payload)->assertOk();
    $stamped = SocialSetting::first()->auto_enabled_at;
    expect($stamped)->not->toBeNull();

    $this->travel(1)->hours();
    $this->putJson('/api/v1/social/settings', $payload)->assertOk();
    expect(SocialSetting::first()->auto_enabled_at->equalTo($stamped))->toBeTrue();
});

test('the connect flow stores the chosen Page and its Instagram account, encrypted', function () {
    config(['services.meta_social.app_id' => 'APP', 'services.meta_social.app_secret' => 'SHH']);
    Http::fake([
        'graph.facebook.com/*/oauth/access_token*' => Http::sequence()->push(['access_token' => 'short'])->push(['access_token' => 'long']),
        'graph.facebook.com/*/me/accounts*' => Http::response(['data' => [[
            'id' => 'PAGE1', 'name' => 'Khadmatona', 'access_token' => 'page-token', 'tasks' => ['CREATE_CONTENT'],
            'instagram_business_account' => ['id' => 'IG1', 'username' => 'khadmatona'],
        ], [
            'id' => 'PAGE2', 'name' => 'Read only', 'access_token' => 'nope', 'tasks' => ['ANALYZE'],
        ]]]),
    ]);
    $this->actingAs($this->admin);

    $url = $this->postJson('/api/v1/social/connection/authorize')->assertOk()->json('data.url');
    parse_str(parse_url($url, PHP_URL_QUERY), $query);
    expect($url)->toStartWith('https://www.facebook.com/v26.0/dialog/oauth')
        ->and($query['scope'])->toContain('pages_manage_posts')
        ->and($query['scope'])->toContain('instagram_content_publish')
        ->and($url)->not->toContain('SHH');

    $response = $this->postJson('/api/v1/social/connection/callback', ['code' => 'c', 'state' => $query['state']])->assertOk();
    expect($response->json('data.pages'))->toHaveCount(1);
    expect($response->getContent())->not->toContain('page-token');

    $this->postJson('/api/v1/social/connection/page', ['page_id' => 'PAGE1'])->assertOk();

    expect(SocialAccount::where('platform', 'facebook')->first()->access_token)->toBe('page-token');
    expect(SocialAccount::where('platform', 'instagram')->first()->external_id)->toBe('IG1');
});

test('a forged or reused OAuth state is refused', function () {
    config(['services.meta_social.app_id' => 'APP', 'services.meta_social.app_secret' => 'SHH']);
    Http::fake();
    $this->actingAs($this->admin);

    $this->postJson('/api/v1/social/connection/callback', ['code' => 'c', 'state' => 'forged'])
        ->assertStatus(422)->assertJsonPath('code', 'invalid_oauth_state');

    Http::assertNothingSent();
});

test('connecting without app credentials reports not configured', function () {
    config(['services.meta_social.app_id' => null, 'services.meta_social.app_secret' => null]);

    $this->actingAs($this->admin)->postJson('/api/v1/social/connection/authorize')
        ->assertStatus(503)->assertJsonPath('code', 'meta_not_configured');
});

test('verifying a revoked token flags the accounts', function () {
    Social::connectAccounts();
    Http::fake(['graph.facebook.com/*/me*' => Social::metaError(190)]);

    $this->actingAs($this->admin)->postJson('/api/v1/social/connection/verify')
        ->assertStatus(409)->assertJsonPath('code', 'token_invalid');

    expect(SocialAccount::first()->status->value)->toBe('needs_reconnect');
});

test('disconnecting removes the stored tokens', function () {
    Social::connectAccounts();

    $this->actingAs($this->admin)->deleteJson('/api/v1/social/connection')->assertOk();

    expect(SocialAccount::count())->toBe(0);
});
