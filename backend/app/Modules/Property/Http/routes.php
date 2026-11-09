<?php

use App\Modules\Property\Http\Controllers\PropertyController;
use App\Modules\Property\Http\Controllers\PropertyStatsController;
use Illuminate\Support\Facades\Route;

// Public showcase site: unauthenticated listing/detail reads - always
// approved-only (PropertyController pins this explicitly, regardless of
// any session).
Route::middleware('throttle:public-read')->group(function () {
    // Must be registered before the apiResource below - otherwise its
    // GET /properties/{property} route matches "facets" as the {property}
    // route-model-binding parameter first and 404s.
    Route::get('/properties/facets', [PropertyController::class, 'facets']);
    Route::apiResource('properties', PropertyController::class)->only(['index', 'show']);
});

// Dashboard reads: Admin sees every property, a Commercial/SeniorCommercial
// only their own (any approval_status), an Owner (Espace Propriétaire,
// read-only) only the property/properties they own - enforced by
// PropertyFilter's row scoping (listing) and PropertyPolicy (single-record).
// A plain authenticated (but role-less, e.g. self-registered) user must not
// reach any of this.
Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial|Owner'])->group(function () {
    Route::get('/dashboard/properties', [PropertyController::class, 'dashboardIndex']);
    Route::get('/dashboard/properties/{property}', [PropertyController::class, 'dashboardShow']);
});

// Dashboard writes: Owner never reaches any of this - "ghir iechof" (view
// only), enforced by simply never including the Owner role here.
Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial'])->group(function () {
    Route::post('/properties', [PropertyController::class, 'store']);
    Route::put('/properties/{property}', [PropertyController::class, 'update']);
    Route::delete('/properties/{property}', [PropertyController::class, 'destroy']);
    Route::delete('/properties/{property}/images/{media}', [PropertyController::class, 'destroyImage']);
});

// Admin-only: moderation and stats.
Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::patch('/properties/{property}/approve', [PropertyController::class, 'approve']);
    Route::patch('/properties/{property}/reject', [PropertyController::class, 'reject']);
    Route::get('/dashboard/stats', PropertyStatsController::class);
});
