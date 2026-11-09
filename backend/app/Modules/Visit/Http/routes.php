<?php

use App\Modules\Visit\Http\Controllers\StoreVisitController;
use App\Modules\Visit\Http\Controllers\VisitController;
use Illuminate\Support\Facades\Route;

// Public, unauthenticated booking endpoint - stricter throttle than reads
// (PROJECT_RULES.md §22), same pattern as Lead/CommercialLead/PropertyAlert.
Route::middleware('throttle:visits')->post('/visits', StoreVisitController::class);

Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial'])->group(function () {
    Route::get('/visits', [VisitController::class, 'index']);
    Route::get('/visits/{visit}', [VisitController::class, 'show']);
    Route::patch('/visits/{visit}/reschedule', [VisitController::class, 'reschedule']);
    Route::patch('/visits/{visit}/report', [VisitController::class, 'report']);
    Route::patch('/visits/{visit}/cancel', [VisitController::class, 'cancel']);
});

Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::patch('/visits/{visit}/assign', [VisitController::class, 'assign']);
});
