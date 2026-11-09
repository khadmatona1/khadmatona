<?php

use App\Modules\Settings\Http\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

// Public showcase site reads settings unauthenticated (hero text, contact
// info, social links) - same throttle limiter Property already registers,
// so no new RateLimiter::for() call is needed here.
Route::middleware('throttle:public-read')->get('/settings', [SettingController::class, 'show']);

// Admin back-office: editing settings behind Sanctum + the Admin role.
Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::get('/settings/edit', [SettingController::class, 'edit']);
    Route::put('/settings', [SettingController::class, 'update']);
});
