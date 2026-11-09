<?php

use App\Modules\SocialPublishing\Http\Controllers\SocialConnectionController;
use App\Modules\SocialPublishing\Http\Controllers\SocialPropertyController;
use App\Modules\SocialPublishing\Http\Controllers\SocialSettingsController;
use Illuminate\Support\Facades\Route;

// Admin-only, every route: publishing speaks publicly in the company's name.
Route::middleware(['auth:sanctum', 'role:Admin'])->prefix('social')->group(function () {
    Route::get('/settings', [SocialSettingsController::class, 'show']);
    Route::put('/settings', [SocialSettingsController::class, 'update']);

    Route::post('/connection/authorize', [SocialConnectionController::class, 'authorizeUrl'])->middleware('throttle:10,1');
    Route::post('/connection/callback', [SocialConnectionController::class, 'callback'])->middleware('throttle:10,1');
    Route::post('/connection/page', [SocialConnectionController::class, 'selectPage'])->middleware('throttle:10,1');
    Route::post('/connection/verify', [SocialConnectionController::class, 'verify'])->middleware('throttle:10,1');
    Route::delete('/connection', [SocialConnectionController::class, 'destroy']);

    Route::get('/properties/{propertyId}', [SocialPropertyController::class, 'show'])->whereNumber('propertyId');
    Route::put('/properties/{propertyId}/preferences', [SocialPropertyController::class, 'updatePreferences'])->whereNumber('propertyId');
    Route::post('/properties/{propertyId}/publish', [SocialPropertyController::class, 'publish'])->whereNumber('propertyId')->middleware('throttle:30,1');
    Route::post('/publications/{publication}/retry', [SocialPropertyController::class, 'retry'])->middleware('throttle:30,1');
});
