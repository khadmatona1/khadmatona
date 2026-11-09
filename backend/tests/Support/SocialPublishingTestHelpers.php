<?php

namespace Tests\Support;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\Property\Infrastructure\Repositories\EloquentPropertyDirectory;
use App\Modules\SocialPublishing\Domain\Enums\SocialAccountStatus;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialSetting;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/** Shared fixtures: no test here ever reaches a real Meta endpoint. */
class SocialPublishingTestHelpers
{
    public const IMAGE = 'https://res.cloudinary.com/demo/image/upload/x/photo.jpg';

    public static function connectAccounts(SocialAccountStatus $status = SocialAccountStatus::Connected): void
    {
        SocialAccount::create(['platform' => 'facebook', 'external_id' => 'PAGE1', 'name' => 'Khadmatona', 'access_token' => 'page-token', 'status' => $status]);
        SocialAccount::create(['platform' => 'instagram', 'external_id' => 'IG1', 'name' => 'khadmatona', 'access_token' => 'page-token', 'status' => $status]);
    }

    /** @param  array<string, mixed>  $overrides */
    public static function settings(array $overrides = []): SocialSetting
    {
        return SocialSetting::create([
            'facebook_enabled' => true,
            'instagram_enabled' => true,
            'default_facebook' => true,
            'default_instagram' => true,
            'default_mode' => 'auto',
            'auto_enabled_at' => now()->subDay(),
            ...$overrides,
        ])->refresh();
    }

    /** Listings keep their real data; only the gallery URLs are stubbed. */
    public static function useImages(array $urls): void
    {
        app()->instance(PropertyDirectory::class, new class($urls) extends EloquentPropertyDirectory
        {
            public function __construct(private readonly array $urls) {}

            public function socialListing(int $id): ?array
            {
                $listing = parent::socialListing($id);

                return $listing === null ? null : ['image_urls' => $this->urls] + $listing;
            }
        });
    }

    /** @param  array<string, mixed>  $overrides  url pattern => response */
    public static function fakeMeta(array $overrides = []): void
    {
        Http::fake($overrides + [
            'res.cloudinary.com/*' => Http::response('', 200, ['Content-Type' => 'image/jpeg', 'Content-Length' => '500000']),
            'graph.facebook.com/*/PAGE1/photos' => Http::sequence()->whenEmpty(Http::response(['id' => 'PHOTO']))->push(['id' => 'PHOTO1'])->push(['id' => 'PHOTO2']),
            'graph.facebook.com/*/PAGE1/feed' => Http::response(['id' => 'PAGE1_POST1']),
            'graph.facebook.com/*/IG1/content_publishing_limit*' => Http::response(['data' => [['quota_usage' => 1, 'config' => ['quota_total' => 50, 'quota_duration' => 86400]]]]),
            'graph.facebook.com/*/IG1/media_publish' => Http::response(['id' => 'IGMEDIA1']),
            'graph.facebook.com/*/IG1/media' => Http::sequence()->whenEmpty(Http::response(['id' => 'CONTAINER']))->push(['id' => 'CONTAINER']),
            'graph.facebook.com/*/CONTAINER*' => Http::response(['status_code' => 'FINISHED']),
        ]);
    }

    /** @return array<int, Request> */
    public static function sentTo(string $pathSuffix): array
    {
        return Http::recorded(fn (Request $request) => str_contains(parse_url($request->url(), PHP_URL_PATH) ?? '', $pathSuffix))
            ->map(fn (array $pair) => $pair[0])
            ->values()
            ->all();
    }

    public static function metaError(int $code, ?int $subcode = null, int $status = 400): PromiseInterface
    {
        return Http::response(['error' => array_filter([
            'message' => 'Boom access_token=SECRET123 end',
            'code' => $code,
            'error_subcode' => $subcode,
        ])], $status);
    }

    public static function platform(string $value): SocialPlatform
    {
        return SocialPlatform::from($value);
    }
}
