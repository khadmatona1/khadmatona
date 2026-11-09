<?php

use App\Modules\PropertyAlert\Http\Controllers\PropertyAlertController;
use App\Modules\PropertyAlert\Http\Controllers\StorePropertyAlertController;
use Illuminate\Support\Facades\Route;

// Public, unauthenticated capture endpoint - stricter throttle than reads
// (PROJECT_RULES.md §22), same pattern as Lead/CommercialLead.
Route::middleware('throttle:property-alerts')->post('/property-alerts', StorePropertyAlertController::class);

Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::get('/property-alerts', [PropertyAlertController::class, 'index']);
    Route::delete('/property-alerts/{propertyAlert}', [PropertyAlertController::class, 'destroy']);
});
