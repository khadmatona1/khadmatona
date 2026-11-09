<?php

/*
|--------------------------------------------------------------------------
| Visitor analytics (App\Modules\Analytics)
|--------------------------------------------------------------------------
|
| First-party, anonymous visitor analytics for the public showcase site. No
| raw IP address, form value, or keystroke is ever stored - see the module's
| AnalyticsServiceProvider docblock for the full privacy posture.
|
*/

return [

    // Master switch for the public collect endpoint. When false the
    // endpoint still answers 202 (the tracker must never see an error) but
    // drops every batch without touching the database.
    'enabled' => (bool) env('ANALYTICS_ENABLED', true),

    // Timezone for "today", "yesterday" and per-day chart buckets. Follows
    // the app-wide Morocco time setting (config/app.php business_timezone)
    // unless explicitly overridden.
    'timezone' => env('ANALYTICS_TIMEZONE', env('BUSINESS_TIMEZONE', 'UTC')),

    // A session ends after this many minutes without any activity - the
    // same default Google Analytics uses. Kept in sync with the frontend
    // tracker (src/lib/analytics/tracker.ts, SESSION_TIMEOUT_MS).
    'session_timeout_minutes' => 30,

    // A visitor counts as "currently online" when their session reported
    // activity (page view, event or heartbeat) within this many seconds.
    // The tracker heartbeats every 30s while the tab is visible.
    'online_window_seconds' => 120,

    // A started form with no activity for this long is counted as
    // abandoned even if the browser never managed to send the explicit
    // form_abandoned beacon (crash, killed tab, lost connection).
    'form_abandon_after_minutes' => 30,

    // Raw rows (sessions, page views, events, form sessions) older than this
    // are deleted by `analytics:prune` (scheduled daily). Keeps the tables
    // bounded and avoids holding behavioral data longer than needed.
    'retention_days' => (int) env('ANALYTICS_RETENTION_DAYS', 395),

    // Dashboard report caching. Ranges that include today are cached
    // briefly so numbers stay fresh; closed historical ranges much longer.
    'cache_ttl_live_seconds' => 60,
    'cache_ttl_closed_seconds' => 3600,

    // Longest custom date range the dashboard accepts, in days.
    'max_range_days' => 366,

    // Collect endpoint abuse limits (per minute). Keyed per anonymous
    // visitor id, with a much higher per-IP ceiling so visitors sharing one
    // NAT/proxy address are not throttled together.
    'rate_limit_per_visitor' => 60,
    'rate_limit_per_ip' => 600,

    // Optional reverse-proxy/CDN geolocation headers. Cloudflare sets
    // CF-IPCountry by default and CF-IPCity with its "visitor location
    // headers" managed transform. Without such a proxy, the country falls
    // back to the browser's timezone (approximate) and city stays unknown.
    'geo_headers' => [
        'country' => array_filter(explode(',', (string) env('ANALYTICS_GEO_COUNTRY_HEADERS', 'CF-IPCountry,X-Country-Code'))),
        'city' => array_filter(explode(',', (string) env('ANALYTICS_GEO_CITY_HEADERS', 'CF-IPCity,X-City'))),
    ],
];
