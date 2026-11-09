<?php

use App\Modules\Property\Domain\Models\Property;
use App\Modules\SocialPublishing\Application\Jobs\PublishPropertyToSocialJob;
use App\Modules\SocialPublishing\Application\PublicationRunner;
use App\Modules\SocialPublishing\Domain\Enums\FailureKind;
use App\Modules\SocialPublishing\Domain\Enums\SocialAccountStatus;
use App\Modules\SocialPublishing\Domain\Exceptions\PublishFailure;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;
use Tests\Support\SocialPublishingTestHelpers as Social;

beforeEach(function () {
    Sleep::fake();
    $this->property = Property::factory()->create(['approval_status' => 'approved', 'status' => 'disponible']);
    Social::settings();
    Social::connectAccounts();
    Social::useImages([Social::IMAGE]);
});

function publication(int $propertyId, string $platform = 'facebook', array $attributes = []): SocialPublication
{
    return SocialPublication::create(['property_id' => $propertyId, 'platform' => $platform, 'status' => 'pending', ...$attributes]);
}

function runPublication(SocialPublication $publication): ?int
{
    return app(PublicationRunner::class)->run($publication->id);
}

test('publishes to a Facebook Page with one unpublished photo then one feed post', function () {
    Social::fakeMeta();
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh())
        ->status->value->toBe('published')
        ->platform_post_id->toBe('PAGE1_POST1')
        ->published_at->not->toBeNull()
        ->retry_count->toBe(0);

    $upload = Social::sentTo('/PAGE1/photos')[0];
    expect($upload->hasHeader('Authorization', 'Bearer page-token'))->toBeTrue()
        ->and($upload->url())->not->toContain('page-token')
        ->and($upload['published'])->toBe('false')
        ->and($upload['url'])->toBe(Social::IMAGE);

    $feed = Social::sentTo('/PAGE1/feed')[0];
    expect($feed['attached_media'][0])->toBe('{"media_fbid":"PHOTO1"}')
        ->and($feed['message'])->toContain('/properties/'.$this->property->id);
});

test('a multi-photo Facebook post attaches every uploaded photo', function () {
    Social::useImages([Social::IMAGE, Social::IMAGE.'?2']);
    Social::fakeMeta();

    runPublication(publication($this->property->id));

    expect(Social::sentTo('/PAGE1/feed')[0]['attached_media'])->toHaveCount(2);
});

test('a Facebook listing with no photos falls back to a link post', function () {
    Social::useImages([]);
    Social::fakeMeta();

    runPublication(publication($this->property->id));

    $feed = Social::sentTo('/PAGE1/feed')[0];
    expect($feed['link'])->toContain('/properties/'.$this->property->id)
        ->and(isset($feed['attached_media']))->toBeFalse();
});

test('publishes a single image to Instagram through a container', function () {
    Social::fakeMeta();
    $publication = publication($this->property->id, 'instagram');

    runPublication($publication);

    expect($publication->fresh())
        ->status->value->toBe('published')
        ->platform_post_id->toBe('IGMEDIA1')
        ->platform_container_id->toBe('CONTAINER');

    expect(Social::sentTo('/IG1/media')[0]['caption'])->toContain('/properties/'.$this->property->id);
    expect(Social::sentTo('/IG1/media_publish')[0]['creation_id'])->toBe('CONTAINER');
});

test('publishes several images to Instagram as a carousel, captioned on the parent only', function () {
    Social::useImages([Social::IMAGE, Social::IMAGE.'?2']);
    Social::fakeMeta([
        'graph.facebook.com/*/IG1/media' => Http::sequence()->push(['id' => 'CHILD1'])->push(['id' => 'CHILD2'])->push(['id' => 'CONTAINER']),
    ]);

    runPublication(publication($this->property->id, 'instagram'));

    $sent = Social::sentTo('/IG1/media');
    $containers = array_values(array_filter($sent, fn ($r) => str_ends_with(parse_url($r->url(), PHP_URL_PATH), '/IG1/media')));

    expect($containers[0]['is_carousel_item'])->toBe('true')
        ->and(isset($containers[0]['caption']))->toBeFalse()
        ->and($containers[2]['media_type'])->toBe('CAROUSEL')
        ->and($containers[2]['children'])->toBe('CHILD1,CHILD2')
        ->and($containers[2]['caption'])->not->toBeEmpty();
});

test('missing credentials fail cleanly without calling Meta', function () {
    SocialAccount::query()->delete();
    Social::fakeMeta();
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh())->status->value->toBe('failed')->error_code->toBe('account_not_connected');
    Http::assertNothingSent();
});

test('an expired token fails the post and flags both accounts for reconnection', function () {
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/photos' => Social::metaError(190, 463, 401)]);
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh())->status->value->toBe('failed')->error_code->toBe('token_invalid');
    expect(SocialAccount::pluck('status')->all())->each->toBe(SocialAccountStatus::NeedsReconnect);
});

test('an account already flagged for reconnection is not retried against Meta', function () {
    SocialAccount::query()->update(['status' => 'needs_reconnect']);
    Social::fakeMeta();
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh()->error_code)->toBe('token_invalid');
    Http::assertNothingSent();
});

test('invalid images fail with a clear reason', function (array $urls, array $head, string $platform, string $code) {
    Social::useImages($urls);
    Social::fakeMeta($head === [] ? [] : ['res.cloudinary.com/*' => Http::response('', $head[0], $head[1])]);
    $publication = publication($this->property->id, $platform);

    runPublication($publication);

    expect($publication->fresh())->status->value->toBe('failed')->error_code->toBe($code);
    expect(Social::sentTo('/feed'))->toBeEmpty();
    expect(Social::sentTo('/media_publish'))->toBeEmpty();
})->with([
    'not https' => [['http://localhost/storage/a.jpg'], [], 'facebook', 'no_valid_images'],
    'private host' => [['https://192.168.1.10/a.jpg'], [], 'instagram', 'no_valid_images'],
    '404' => [[Social::IMAGE], [404, []], 'instagram', 'no_valid_images'],
    'png on instagram' => [[Social::IMAGE], [200, ['Content-Type' => 'image/png']], 'instagram', 'no_valid_images'],
    'html page' => [[Social::IMAGE], [200, ['Content-Type' => 'text/html']], 'facebook', 'no_valid_images'],
    'over 4 MB on facebook' => [[Social::IMAGE], [200, ['Content-Type' => 'image/jpeg', 'Content-Length' => '5000000']], 'facebook', 'no_valid_images'],
    'no photo on instagram' => [[], [], 'instagram', 'no_images'],
]);

test('one bad photo is dropped without failing the post', function () {
    Social::useImages(['http://localhost/a.jpg', Social::IMAGE]);
    Social::fakeMeta();
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh()->status->value)->toBe('published');
    expect(Social::sentTo('/PAGE1/photos'))->toHaveCount(1);
});

test('a permanent API error is stored with secrets redacted and not retried', function () {
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/photos' => Social::metaError(200)]);
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh())
        ->status->value->toBe('failed')
        ->error_code->toBe('meta_rejected')
        ->error_message->toContain('[redacted]')
        ->error_message->not->toContain('SECRET123');
});

test('logs never contain tokens or secrets', function () {
    Log::spy();
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/photos' => Social::metaError(200)]);

    runPublication(publication($this->property->id));

    Log::shouldHaveReceived('warning')->withArgs(function (string $event, array $context) {
        return ! str_contains(json_encode($context), 'SECRET123') && ! str_contains(json_encode($context), 'page-token');
    });
});

test('a transient API failure stays pending and is rethrown for queue backoff', function () {
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/photos' => Social::metaError(2, null, 500)]);
    $publication = publication($this->property->id);

    expect(fn () => runPublication($publication))
        ->toThrow(fn (PublishFailure $e) => expect($e->kind)->toBe(FailureKind::Retryable));

    expect($publication->fresh())->status->value->toBe('pending')->error_code->toBe('meta_unreachable');
});

test('rate limiting asks the job to come back later', function () {
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/photos' => Social::metaError(4)]);
    $publication = publication($this->property->id);

    expect(runPublication($publication))->toBe(900);
    expect($publication->fresh())->status->value->toBe('pending')->error_code->toBe('rate_limited');
});

test('a full Instagram quota waits without creating a container', function () {
    Social::fakeMeta(['graph.facebook.com/*/IG1/content_publishing_limit*' => Http::response(['data' => [['quota_usage' => 50, 'config' => ['quota_total' => 50]]]])]);
    $publication = publication($this->property->id, 'instagram');

    expect(runPublication($publication))->toBe(3600);
    expect($publication->fresh()->error_code)->toBe('instagram_quota_reached');
    expect(Social::sentTo('/IG1/media'))->toBeEmpty();
});

test('retries count attempts and a later attempt succeeds', function () {
    Social::fakeMeta([
        'graph.facebook.com/*/PAGE1/photos' => Http::sequence()->push(['error' => ['code' => 2, 'message' => 'x']], 500)->push(['id' => 'PHOTO1']),
    ]);
    $publication = publication($this->property->id);

    expect(fn () => runPublication($publication))->toThrow(PublishFailure::class);
    runPublication($publication);

    expect($publication->fresh())->status->value->toBe('published')->retry_count->toBe(1)->error_code->toBeNull();
});

test('the job declares retries with increasing backoff and gives up cleanly', function () {
    $job = new PublishPropertyToSocialJob(1);
    expect($job->tries)->toBe(5)->and($job->backoff())->toBe([60, 300, 900, 1800]);

    $publication = publication($this->property->id, 'facebook', ['error_code' => 'meta_unreachable', 'error_message' => 'down']);
    (new PublishPropertyToSocialJob($publication->id))->failed(new RuntimeException('x'));

    expect($publication->fresh())->status->value->toBe('failed')->error_message->toBe('down');
});

test('a retry after a dropped Instagram publish call never posts twice', function () {
    $containerStatus = 'FINISHED';
    $publishCalls = 0;
    Social::fakeMeta([
        'graph.facebook.com/*/CONTAINER*' => function () use (&$containerStatus) {
            return Http::response(['status_code' => $containerStatus]);
        },
        'graph.facebook.com/*/IG1/media_publish' => function () use (&$publishCalls) {
            $publishCalls++;

            throw new ConnectionException('timed out');
        },
    ]);
    $publication = publication($this->property->id, 'instagram');

    expect(fn () => runPublication($publication))->toThrow(PublishFailure::class);
    expect($publication->fresh()->platform_container_id)->toBe('CONTAINER');

    // The call did go through: Meta now reports the container as published.
    $containerStatus = 'PUBLISHED';
    runPublication($publication);

    expect($publication->fresh()->status->value)->toBe('published');
    expect($publishCalls)->toBe(1);
});

test('a Facebook publish timeout is never auto-retried because the post may be live', function () {
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/feed' => fn () => throw new ConnectionException('timed out')]);
    $publication = publication($this->property->id);

    expect(runPublication($publication))->toBeNull();

    expect($publication->fresh())->status->value->toBe('failed')->error_code->toBe('outcome_unknown');
});

test('a finished publication is untouched by a redelivered job', function () {
    Social::fakeMeta();
    $publication = publication($this->property->id);

    runPublication($publication);
    runPublication($publication);

    expect(Social::sentTo('/PAGE1/feed'))->toHaveCount(1);
});

test('a row locked by a live worker is left alone and re-checked later', function () {
    Social::fakeMeta();
    $publication = publication($this->property->id, 'facebook', ['status' => 'publishing', 'locked_at' => now()]);

    expect(runPublication($publication))->toBe(200);
    Http::assertNothingSent();
});

test('a dead worker mid-commit on Facebook is flagged for review, never reposted', function () {
    Social::fakeMeta();
    $publication = publication($this->property->id, 'facebook', [
        'status' => 'publishing', 'locked_at' => now()->subHour(), 'commit_started_at' => now()->subHour(),
    ]);

    runPublication($publication);

    expect($publication->fresh())->status->value->toBe('failed')->error_code->toBe('outcome_unknown');
    Http::assertNothingSent();
});

test('a dead worker before the final call is safely resumed', function () {
    Social::fakeMeta();
    $publication = publication($this->property->id, 'facebook', ['status' => 'publishing', 'locked_at' => now()->subHour()]);

    runPublication($publication);

    expect($publication->fresh()->status->value)->toBe('published');
});

test('a property taken offline before the job runs is not published', function () {
    Social::fakeMeta();
    $this->property->update(['status' => 'vendu']);
    $publication = publication($this->property->id);

    runPublication($publication);

    expect($publication->fresh())->status->value->toBe('failed')->error_code->toBe('property_not_public');
    Http::assertNothingSent();
});

test('a Facebook failure does not affect Instagram', function () {
    Social::fakeMeta(['graph.facebook.com/*/PAGE1/photos' => Social::metaError(200)]);
    $facebook = publication($this->property->id);
    $instagram = publication($this->property->id, 'instagram');

    runPublication($facebook);
    runPublication($instagram);

    expect($facebook->fresh()->status->value)->toBe('failed');
    expect($instagram->fresh()->status->value)->toBe('published');
});

test('the access token is encrypted at rest', function () {
    $raw = DB::table('social_accounts')->where('platform', 'facebook')->value('access_token');

    expect($raw)->not->toContain('page-token')
        ->and(SocialAccount::where('platform', 'facebook')->first()->access_token)->toBe('page-token')
        ->and(SocialAccount::first()->toArray())->not->toHaveKey('access_token');
});
