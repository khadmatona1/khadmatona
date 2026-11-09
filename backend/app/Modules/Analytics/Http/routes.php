<?php

use App\Modules\Analytics\Http\Controllers\AnalyticsReportController;
use App\Modules\Analytics\Http\Controllers\CollectController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

// Public tracker endpoint: anonymous, batched, throttled per visitor and
// per IP (AnalyticsServiceProvider). Taken out of Sanctum's stateful SPA
// pipeline on purpose: it needs no session or auth, so skipping it means
// a tracker beacon never starts/writes a Laravel session row and needs no
// CSRF token, which lets navigator.sendBeacon deliver the last batch while
// a tab is closing.
Route::middleware('throttle:analytics')
    ->withoutMiddleware(EnsureFrontendRequestsAreStateful::class)
    ->post('/analytics/collect', CollectController::class);

// Visitor analytics is Admin-only: Commercial/Owner accounts never see it.
Route::middleware(['auth:sanctum', 'role:Admin'])->prefix('analytics')->group(function () {
    Route::get('/overview', [AnalyticsReportController::class, 'overview']);
    Route::get('/sources', [AnalyticsReportController::class, 'sources']);
    Route::get('/pages', [AnalyticsReportController::class, 'pages']);
    Route::get('/properties', [AnalyticsReportController::class, 'properties']);
    Route::get('/forms', [AnalyticsReportController::class, 'forms']);
    Route::get('/events', [AnalyticsReportController::class, 'events']);
    Route::get('/journeys', [AnalyticsReportController::class, 'journeys']);
    Route::get('/realtime', [AnalyticsReportController::class, 'realtime']);
});
