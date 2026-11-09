<?php

use App\Modules\Analytics\Domain\Models\AnalyticsEvent;
use App\Modules\Analytics\Domain\Models\AnalyticsFormSession;
use App\Modules\Analytics\Domain\Models\AnalyticsPageView;
use App\Modules\Analytics\Domain\Models\AnalyticsSession;
use App\Modules\Analytics\Domain\Models\AnalyticsVisitor;
use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

const BROWSER_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

beforeEach(function () {
    $this->visitorId = (string) Str::uuid();
    $this->sessionId = (string) Str::uuid();

    // Sends one tracker batch exactly the way src/lib/analytics/tracker.ts
    // does. The queue runs synchronously in tests (phpunit.xml).
    $this->collect = function (array $events, array $overrides = [], array $headers = []) {
        $now = (int) floor(microtime(true) * 1000);

        return $this->withHeaders(['User-Agent' => BROWSER_UA, ...$headers])->postJson('/api/v1/analytics/collect', array_merge([
            'visitor_id' => $this->visitorId,
            'session_id' => $this->sessionId,
            'sent_at' => $now,
            'context' => ['referrer' => null, 'locale' => 'fr', 'timezone' => 'Africa/Casablanca'],
            'events' => array_map(fn (array $event) => $event + ['ts' => $now], $events),
        ], $overrides));
    };

    $this->pageView = fn (string $path, ?string $id = null) => [
        'type' => 'page_view',
        'path' => $path,
        'page_view_id' => $id ?? (string) Str::uuid(),
    ];
});

test('an anonymous page view creates a visitor, a session and a page view', function () {
    ($this->collect)([($this->pageView)('/')])->assertStatus(202);

    expect(AnalyticsVisitor::count())->toBe(1);

    $session = AnalyticsSession::first();
    expect($session->uuid)->toBe($this->sessionId)
        ->and($session->landing_path)->toBe('/')
        ->and($session->page_views_count)->toBe(1)
        ->and($session->source->value)->toBe('direct')
        ->and($session->device_type->value)->toBe('mobile')
        ->and($session->browser)->toBe('Safari')
        ->and($session->os)->toBe('iOS')
        ->and($session->country)->toBe('MA')
        ->and($session->geo_source)->toBe('timezone')
        ->and($session->city)->toBeNull();

    expect(AnalyticsPageView::first()->page_type->value)->toBe('home');
});

test('a property page view is classified server-side with its property id', function () {
    ($this->collect)([($this->pageView)('/properties/123?utm_source=x#gallery')])->assertStatus(202);

    $view = AnalyticsPageView::first();
    expect($view->path)->toBe('/properties/123')
        ->and($view->page_type->value)->toBe('property')
        ->and($view->property_id)->toBe(123);
});

test('page views are idempotent on their id and durations only grow', function () {
    $id = (string) Str::uuid();

    ($this->collect)([($this->pageView)('/about', $id)]);
    ($this->collect)([($this->pageView)('/about', $id)]);
    ($this->collect)([['type' => 'heartbeat', 'page_view_id' => $id, 'duration_ms' => 30_000]]);
    ($this->collect)([['type' => 'page_leave', 'page_view_id' => $id, 'duration_ms' => 12_000]]);

    expect(AnalyticsPageView::count())->toBe(1)
        ->and(AnalyticsPageView::first()->duration_seconds)->toBe(30)
        ->and(AnalyticsSession::first()->page_views_count)->toBe(1);
});

test('the exit page follows the latest page view', function () {
    ($this->collect)([($this->pageView)('/'), ($this->pageView)('/properties'), ($this->pageView)('/properties/9')]);

    $session = AnalyticsSession::first();
    expect($session->exit_path)->toBe('/properties/9')
        ->and($session->landing_path)->toBe('/')
        ->and($session->page_views_count)->toBe(3);
});

test('click events are recorded with their property', function () {
    ($this->collect)([
        ($this->pageView)('/properties/5'),
        ['type' => 'whatsapp_click', 'path' => '/properties/5', 'label' => 'header'],
        ['type' => 'phone_click', 'path' => '/properties/5'],
    ])->assertStatus(202);

    $whatsapp = AnalyticsEvent::where('event_type', 'whatsapp_click')->first();
    expect($whatsapp)->not->toBeNull()
        ->and($whatsapp->property_id)->toBe(5)
        ->and($whatsapp->label)->toBe('header');
    expect(AnalyticsSession::first()->events_count)->toBe(2);
});

test('a submitted form moves through started, interaction and submitted', function () {
    $formId = (string) Str::uuid();
    $form = ['form_id' => $formId, 'form_type' => 'visit_request', 'property_id' => 7, 'path' => '/properties/7'];

    ($this->collect)([
        ['type' => 'form_started'] + $form,
        ['type' => 'form_field_interaction', 'field' => 'name'] + $form,
        ['type' => 'form_field_interaction', 'field' => 'phone'] + $form,
        ['type' => 'form_submitted'] + $form,
    ])->assertStatus(202);

    $formSession = AnalyticsFormSession::first();
    expect($formSession->status->value)->toBe('submitted')
        ->and($formSession->fields_interacted)->toBe(['name', 'phone'])
        ->and($formSession->submitted_at)->not->toBeNull()
        ->and($formSession->property_id)->toBe(7);
    expect(AnalyticsSession::first()->converted_at)->not->toBeNull();
});

test('an abandoned form stores field names only and never any value', function () {
    $formId = (string) Str::uuid();
    $form = ['form_id' => $formId, 'form_type' => 'contact', 'path' => '/contact'];

    ($this->collect)([
        ['type' => 'form_started'] + $form,
        ['type' => 'form_field_interaction', 'field' => 'email'] + $form,
        ['type' => 'form_field_interaction', 'field' => 'phone'] + $form,
        ['type' => 'form_abandoned', 'field' => 'phone'] + $form,
    ])->assertStatus(202);

    $formSession = AnalyticsFormSession::first();
    expect($formSession->status->value)->toBe('abandoned')
        ->and($formSession->last_field)->toBe('phone')
        ->and($formSession->abandoned_at)->not->toBeNull();

    // No lead was created and nothing personal reached any analytics table.
    expect(Lead::count())->toBe(0);
    foreach (['analytics_form_sessions', 'analytics_events', 'analytics_sessions', 'analytics_page_views'] as $table) {
        $dump = json_encode(DB::table($table)->get());
        expect($dump)->not->toContain('@')->not->toContain('127.0.0.1');
    }
});

test('the tracker cannot smuggle form values through field names or extra keys', function () {
    $form = ['form_id' => (string) Str::uuid(), 'form_type' => 'contact'];

    ($this->collect)([['type' => 'form_field_interaction', 'field' => 'john@example.com'] + $form])
        ->assertStatus(422);
    ($this->collect)([['type' => 'form_field_interaction', 'field' => '+212 600 000 000'] + $form])
        ->assertStatus(422);
    ($this->collect)([['type' => 'form_field_interaction', 'field' => 'email', 'value' => 'john@example.com'] + $form])
        ->assertStatus(422);

    expect(AnalyticsFormSession::count())->toBe(0);
});

test('a form reported abandoned and then submitted counts as submitted', function () {
    $form = ['form_id' => (string) Str::uuid(), 'form_type' => 'contact'];

    ($this->collect)([['type' => 'form_started'] + $form, ['type' => 'form_abandoned', 'field' => 'name'] + $form]);
    expect(AnalyticsFormSession::first()->status->value)->toBe('abandoned');

    ($this->collect)([['type' => 'form_field_interaction', 'field' => 'message'] + $form]);
    expect(AnalyticsFormSession::first()->status->value)->toBe('started');

    ($this->collect)([['type' => 'form_submitted'] + $form, ['type' => 'form_abandoned'] + $form]);
    expect(AnalyticsFormSession::first()->status->value)->toBe('submitted')
        ->and(AnalyticsFormSession::first()->abandoned_at)->toBeNull();
});

test('unknown event types and form types are rejected', function () {
    ($this->collect)([['type' => 'keystroke', 'path' => '/']])->assertStatus(422);
    ($this->collect)([['type' => 'form_started', 'form_id' => (string) Str::uuid(), 'form_type' => 'password_reset']])->assertStatus(422);
});

test('batches are capped in size', function () {
    $events = array_fill(0, 51, ['type' => 'cta_click', 'label' => 'x']);

    ($this->collect)($events)->assertStatus(422);
});

test('bots are ignored', function () {
    ($this->collect)([($this->pageView)('/')], headers: ['User-Agent' => 'Googlebot/2.1 (+http://www.google.com/bot.html)'])
        ->assertStatus(202);

    expect(AnalyticsSession::count())->toBe(0);
});

test('traffic sources are classified from the referrer and UTM tags', function () {
    ($this->collect)([($this->pageView)('/')], ['context' => ['referrer' => 'https://www.google.co.ma/search?q=villa+marrakech']]);
    expect(AnalyticsSession::first()->source->value)->toBe('google')
        ->and(AnalyticsSession::first()->medium)->toBe('organic')
        ->and(AnalyticsSession::first()->referrer_host)->toBe('www.google.co.ma');

    $this->sessionId = (string) Str::uuid();
    ($this->collect)([($this->pageView)('/')], ['context' => ['utm_source' => 'instagram', 'utm_medium' => 'cpc', 'utm_campaign' => 'summer']]);
    $tagged = AnalyticsSession::where('uuid', $this->sessionId)->first();
    expect($tagged->source->value)->toBe('instagram')
        ->and($tagged->medium)->toBe('paid')
        ->and($tagged->utm_campaign)->toBe('summer');
});

test('proxy geo headers take precedence over the timezone fallback', function () {
    ($this->collect)([($this->pageView)('/')], headers: ['CF-IPCountry' => 'FR', 'CF-IPCity' => 'Paris']);

    $session = AnalyticsSession::first();
    expect($session->country)->toBe('FR')
        ->and($session->city)->toBe('Paris')
        ->and($session->geo_source)->toBe('header');
});

test('a session id cannot be reused under a different visitor', function () {
    ($this->collect)([($this->pageView)('/')]);

    $this->visitorId = (string) Str::uuid();
    ($this->collect)([($this->pageView)('/contact')])->assertStatus(202);

    expect(AnalyticsSession::first()->page_views_count)->toBe(1)
        ->and(AnalyticsPageView::count())->toBe(1);
});

test('a same-origin beacon needs no CSRF token and starts no Laravel session', function () {
    $response = ($this->collect)([($this->pageView)('/')], headers: ['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);

    $response->assertStatus(202);
    expect($response->headers->getCookies())->toBeEmpty();
});

test('the endpoint accepts but drops batches when analytics is disabled', function () {
    config(['analytics.enabled' => false]);

    ($this->collect)([($this->pageView)('/')])->assertStatus(202);

    expect(AnalyticsSession::count())->toBe(0);
});

test('the collect endpoint is rate limited per visitor', function () {
    config(['analytics.rate_limit_per_visitor' => 2]);

    ($this->collect)([($this->pageView)('/')])->assertStatus(202);
    ($this->collect)([($this->pageView)('/')])->assertStatus(202);
    ($this->collect)([($this->pageView)('/')])->assertStatus(429);
});

test('a sendBeacon text/plain body is parsed like JSON', function () {
    $now = (int) floor(microtime(true) * 1000);
    $body = json_encode([
        'visitor_id' => $this->visitorId,
        'session_id' => $this->sessionId,
        'sent_at' => $now,
        'events' => [['type' => 'page_view', 'ts' => $now, 'path' => '/services', 'page_view_id' => (string) Str::uuid()]],
    ]);

    $this->call('POST', '/api/v1/analytics/collect', [], [], [], [
        'CONTENT_TYPE' => 'text/plain;charset=UTF-8',
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_USER_AGENT' => BROWSER_UA,
    ], $body)->assertStatus(202);

    expect(AnalyticsPageView::first()?->path)->toBe('/services');
});
