<?php

use App\Models\User;
use App\Modules\Analytics\Domain\Models\AnalyticsFormSession;
use App\Modules\Analytics\Domain\Models\AnalyticsSession;
use App\Modules\Analytics\Domain\Models\AnalyticsVisitor;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    $this->property = Property::factory()->create(['title' => 'Villa Palmeraie']);

    // One tracker batch for a given visitor/session, like tracker.ts sends.
    $this->track = function (string $visitor, string $session, array $events, array $context = [], string $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36') {
        $now = (int) floor(microtime(true) * 1000);

        $this->withHeaders(['User-Agent' => $ua])->postJson('/api/v1/analytics/collect', [
            'visitor_id' => $visitor,
            'session_id' => $session,
            'sent_at' => $now,
            'context' => $context + ['timezone' => 'Africa/Casablanca'],
            'events' => array_map(fn (array $event) => $event + ['ts' => $now], $events),
        ])->assertStatus(202);
    };

    $this->pv = fn (string $path) => ['type' => 'page_view', 'path' => $path, 'page_view_id' => (string) Str::uuid()];

    // Visitor A: Google -> home -> property -> WhatsApp -> visit form submitted.
    $this->visitorA = (string) Str::uuid();
    $form = ['form_id' => (string) Str::uuid(), 'form_type' => 'visit_request', 'property_id' => $this->property->id];
    ($this->track)($this->visitorA, (string) Str::uuid(), [
        ($this->pv)('/'),
        ($this->pv)("/properties/{$this->property->id}"),
        ['type' => 'whatsapp_click', 'path' => "/properties/{$this->property->id}"],
        ['type' => 'form_started'] + $form,
        ['type' => 'form_field_interaction', 'field' => 'phone'] + $form,
        ['type' => 'form_submitted'] + $form,
    ], ['referrer' => 'https://www.google.com/']);

    // Visitor B: direct, mobile -> property -> contact form abandoned at phone.
    $contact = ['form_id' => (string) Str::uuid(), 'form_type' => 'contact'];
    ($this->track)((string) Str::uuid(), (string) Str::uuid(), [
        ($this->pv)("/properties/{$this->property->id}"),
        ($this->pv)('/contact'),
        ['type' => 'form_started'] + $contact,
        ['type' => 'form_field_interaction', 'field' => 'name'] + $contact,
        ['type' => 'form_field_interaction', 'field' => 'phone'] + $contact,
        ['type' => 'form_abandoned', 'field' => 'phone'] + $contact,
    ], [], 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36');

    // The existing lead flow, completely unchanged by analytics.
    $this->postJson('/api/v1/leads', [
        'type' => 'visit_request',
        'name' => 'Yasmine El Amrani',
        'email' => 'yasmine@example.com',
        'property_id' => $this->property->id,
    ])->assertStatus(201);
});

test('guests and non-admin roles cannot read analytics', function () {
    $this->getJson('/api/v1/analytics/overview')->assertStatus(401);

    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');

    foreach (['overview', 'sources', 'pages', 'properties', 'forms', 'events', 'journeys', 'realtime'] as $report) {
        $this->actingAs($commercial)->getJson("/api/v1/analytics/{$report}")->assertStatus(403);
    }
});

test('the overview reports visitors, sessions, page views, leads and conversion', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=today');

    $response->assertOk()
        ->assertJsonPath('data.cards.visitors_today', 2)
        ->assertJsonPath('data.cards.visitors_week', 2)
        ->assertJsonPath('data.cards.sessions', 2)
        ->assertJsonPath('data.cards.visitors', 2)
        ->assertJsonPath('data.cards.page_views', 4)
        ->assertJsonPath('data.cards.leads', 1)
        ->assertJsonPath('data.cards.form_submissions', 1)
        ->assertJsonPath('data.cards.converted_sessions', 1)
        ->assertJsonPath('data.cards.conversion_rate', 50)
        ->assertJsonPath('data.funnel.sessions', 2)
        ->assertJsonPath('data.funnel.property_viewers', 2)
        ->assertJsonPath('data.funnel.form_starters', 2)
        ->assertJsonPath('data.funnel.converters', 1);

    $today = CarbonImmutable::now('Africa/Casablanca')->format('Y-m-d');
    expect($response->json('data.series'))->toHaveCount(1)
        ->and($response->json('data.series.0'))->toMatchArray(['date' => $today, 'visitors' => 2, 'sessions' => 2, 'page_views' => 4, 'leads' => 1]);
});

test('the 7 and 30 day series contain one point per day', function () {
    $week = $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=7d')->assertOk();
    $month = $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=30d')->assertOk();

    expect($week->json('data.series'))->toHaveCount(7)
        ->and($month->json('data.series'))->toHaveCount(30);
});

test('yesterday excludes today\'s traffic', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=yesterday')
        ->assertOk()
        ->assertJsonPath('data.cards.sessions', 0)
        ->assertJsonPath('data.cards.leads', 0);
});

test('sources separate google from direct traffic', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/sources?range=today')->assertOk();

    $sources = collect($response->json('data.sources'))->keyBy('source');
    expect($sources['google']['sessions'])->toBe(1)
        ->and($sources['google']['conversions'])->toBe(1)
        ->and($sources['direct']['sessions'])->toBe(1);

    $devices = collect($response->json('data.devices'))->pluck('sessions', 'value');
    expect($devices['desktop'])->toBe(1)->and($devices['mobile'])->toBe(1);
});

test('filters narrow every report to matching sessions', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=today&source=google')
        ->assertOk()
        ->assertJsonPath('data.cards.sessions', 1)
        ->assertJsonPath('data.cards.page_views', 2);

    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=today&device=mobile')
        ->assertOk()
        ->assertJsonPath('data.cards.sessions', 1);

    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=today&page=/contact')
        ->assertOk()
        ->assertJsonPath('data.cards.sessions', 1);

    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=today&event=whatsapp_click')
        ->assertOk()
        ->assertJsonPath('data.cards.sessions', 1);

    $this->actingAs($this->admin)->getJson('/api/v1/analytics/forms?range=today&form=contact')
        ->assertOk()
        ->assertJsonCount(1, 'data.forms')
        ->assertJsonPath('data.forms.0.form_type', 'contact');
});

test('invalid filters and ranges are rejected', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?source=myspace')->assertStatus(422);
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?event=keystroke')->assertStatus(422);
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=custom')->assertStatus(422);
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=custom&from=2026-01-10&to=2026-01-01')->assertStatus(422);
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/overview?range=custom&from=2024-01-01&to=2026-01-01')->assertStatus(422);
});

test('a custom range works', function () {
    $today = CarbonImmutable::now('Africa/Casablanca');

    $this->actingAs($this->admin)
        ->getJson('/api/v1/analytics/overview?range=custom&from='.$today->subDays(2)->format('Y-m-d').'&to='.$today->format('Y-m-d'))
        ->assertOk()
        ->assertJsonPath('data.cards.sessions', 2)
        ->assertJsonCount(3, 'data.series');
});

test('the forms report shows starts, submissions, abandonments and drop-off', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/forms?range=today')->assertOk();

    $forms = collect($response->json('data.forms'))->keyBy('form_type');
    expect($forms['visit_request'])->toMatchArray(['started' => 1, 'submitted' => 1, 'abandoned' => 0, 'conversion_rate' => 100])
        ->and($forms['contact'])->toMatchArray(['started' => 1, 'submitted' => 0, 'abandoned' => 1, 'conversion_rate' => 0, 'abandonment_rate' => 100])
        ->and($forms['contact']['drop_off_fields'])->toBe([['field' => 'phone', 'count' => 1]]);
});

test('a started form idle past the threshold counts as abandoned', function () {
    AnalyticsFormSession::where('form_type', 'visit_request')->update([
        'status' => 'started',
        'submitted_at' => null,
        'last_interaction_at' => now()->subHours(2),
    ]);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/forms?range=7d')->assertOk();

    $visit = collect($response->json('data.forms'))->firstWhere('form_type', 'visit_request');
    expect($visit['abandoned'])->toBe(1)->and($visit['in_progress'])->toBe(0);
});

test('the properties report joins titles and real leads', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/properties?range=today')->assertOk();

    $response->assertJsonPath('data.properties.0.property_id', $this->property->id)
        ->assertJsonPath('data.properties.0.title', 'Villa Palmeraie')
        ->assertJsonPath('data.properties.0.views', 2)
        ->assertJsonPath('data.properties.0.visitors', 2)
        ->assertJsonPath('data.properties.0.cta_clicks', 1)
        ->assertJsonPath('data.properties.0.contact_clicks', 1)
        ->assertJsonPath('data.properties.0.leads', 1)
        ->assertJsonPath('data.properties.0.conversion_rate', 50);
});

test('the pages report shows views, visitors and exits', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/pages?range=today')->assertOk();

    $pages = collect($response->json('data.pages'))->keyBy('path');
    expect($pages["/properties/{$this->property->id}"])->toMatchArray(['views' => 2, 'visitors' => 2, 'exits' => 1])
        ->and($pages['/contact']['exits'])->toBe(1);
});

test('the events report counts page, property and click events', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/events?range=today')->assertOk();

    $events = collect($response->json('data.events'))->pluck('count', 'event_type');
    expect($events['page_view'])->toBe(4)
        ->and($events['property_view'])->toBe(2)
        ->and($events['whatsapp_click'])->toBe(1)
        ->and($events['form_abandoned'])->toBe(1);
});

test('journeys show an anonymized, ordered timeline', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/v1/analytics/journeys?range=today')->assertOk();

    $response->assertJsonPath('meta.pagination.total', 2);

    $journey = collect($response->json('data'))->firstWhere('source', 'google');
    expect($journey['visitor_label'])->toMatch('/^#[0-9A-F]{4}$/')
        ->and(json_encode($response->json()))->not->toContain($this->visitorA)
        ->and(array_column($journey['steps'], 'type'))->toBe([
            'page_view', 'property_view', 'whatsapp_click', 'form_started', 'form_field_interaction', 'form_submitted',
        ])
        ->and($journey['steps'][1]['property_title'])->toBe('Villa Palmeraie')
        ->and($journey['converted'])->toBeTrue();
});

test('realtime lists currently active visitors', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/analytics/realtime')
        ->assertOk()
        ->assertJsonPath('data.visitors', 2)
        ->assertJsonPath('data.sessions', 2)
        ->assertJsonCount(2, 'data.items');
});

test('lead creation is untouched by analytics', function () {
    expect(Lead::count())->toBe(1)
        ->and(Lead::first()->commercial_id)->toBe($this->property->commercial_id);
});

test('prune deletes analytics data older than the retention period', function () {
    AnalyticsSession::query()->update(['last_activity_at' => now()->subDays(400)]);
    AnalyticsVisitor::query()->update(['last_seen_at' => now()->subDays(400)]);

    $this->artisan('analytics:prune')->assertSuccessful();

    expect(AnalyticsSession::count())->toBe(0)
        ->and(AnalyticsVisitor::count())->toBe(0)
        ->and(AnalyticsFormSession::count())->toBe(0)
        ->and(Lead::count())->toBe(1);
});
