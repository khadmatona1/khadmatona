<?php

use App\Modules\Analytics\Domain\Enums\PageType;
use App\Modules\Analytics\Domain\Services\PageClassifier;
use App\Modules\Analytics\Domain\Services\TrafficSourceClassifier;
use App\Modules\Analytics\Domain\Services\UserAgentParser;

test('referrers map to the expected channels', function (?string $referrer, string $source, string $medium) {
    $result = (new TrafficSourceClassifier)->classify($referrer, null, null, ['khadmatona.com']);

    expect($result->source->value)->toBe($source)->and($result->medium)->toBe($medium);
})->with([
    'no referrer' => [null, 'direct', 'direct'],
    'own site' => ['https://www.khadmatona.com/properties', 'direct', 'direct'],
    'google' => ['https://www.google.fr/', 'google', 'organic'],
    'facebook mobile' => ['https://m.facebook.com/', 'facebook', 'social'],
    'facebook link shim' => ['https://l.facebook.com/l.php?u=x', 'facebook', 'social'],
    'instagram' => ['https://l.instagram.com/', 'instagram', 'social'],
    'tiktok' => ['https://www.tiktok.com/', 'tiktok', 'social'],
    'bing' => ['https://www.bing.com/search?q=x', 'other_search', 'organic'],
    'gmail web' => ['https://mail.google.com/', 'email', 'email'],
    't.co is not reddit' => ['https://www.reddit.com/', 'other_social', 'social'],
    'avito' => ['https://www.avito.ma/', 'referral', 'referral'],
]);

test('UTM tags override the referrer', function () {
    $result = (new TrafficSourceClassifier)->classify(null, 'facebook', 'paid_social', []);

    expect($result->source->value)->toBe('facebook')->and($result->medium)->toBe('paid');
});

test('user agents map to coarse device, browser and OS buckets', function (string $ua, string $device, ?string $browser, ?string $os) {
    $parsed = (new UserAgentParser)->parse($ua);

    expect($parsed->deviceType->value)->toBe($device)
        ->and($parsed->browser)->toBe($browser)
        ->and($parsed->os)->toBe($os);
})->with([
    'iphone safari' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', 'mobile', 'Safari', 'iOS'],
    'android chrome' => ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36', 'mobile', 'Chrome', 'Android'],
    'android tablet' => ['Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36', 'tablet', 'Chrome', 'Android'],
    'windows edge' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0', 'desktop', 'Edge', 'Windows'],
    'mac firefox' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:129.0) Gecko/20100101 Firefox/129.0', 'desktop', 'Firefox', 'macOS'],
    'instagram in-app' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0', 'mobile', 'Instagram', 'iOS'],
]);

test('bots are detected', function () {
    $parser = new UserAgentParser;

    expect($parser->isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'))->toBeTrue()
        ->and($parser->isBot('Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/128.0'))->toBeTrue()
        ->and($parser->isBot(''))->toBeTrue()
        ->and($parser->isBot('Mozilla/5.0 (Windows NT 10.0) Chrome/128.0 Safari/537.36'))->toBeFalse();
});

test('paths are normalized and classified', function () {
    $pages = new PageClassifier;

    expect($pages->normalizePath('/properties/12/?q=a@b.com#x'))->toBe('/properties/12')
        ->and($pages->normalizePath('https://evil.test/'))->toBeNull()
        ->and($pages->classify('/'))->toBe(PageType::Home)
        ->and($pages->classify('/properties/12')->value)->toBe('property')
        ->and($pages->propertyId('/properties/12'))->toBe(12)
        ->and($pages->propertyId('/properties/facets'))->toBeNull()
        ->and($pages->classify('/blog/mon-article')->value)->toBe('blog_post');
});
