<?php

use App\Modules\CommercialLead\Http\Controllers\CommercialLeadController;
use App\Modules\CommercialLead\Http\Controllers\ImportCommercialLeadsController;
use App\Modules\CommercialLead\Http\Controllers\StoreCommercialLeadController;
use Illuminate\Support\Facades\Route;

// Public capture endpoint for real-estate professionals applying to become
// KHADAMATONA partners - rate-limited more strictly than reads, same
// pattern as Lead's own public capture endpoint (PROJECT_RULES.md §22).
Route::middleware('throttle:commercial-leads')->post('/commercial-leads', StoreCommercialLeadController::class);

// Admin back-office: view, triage, and act on submitted partner applications.
Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::post('/commercial-leads/import', ImportCommercialLeadsController::class);
    Route::get('/commercial-leads', [CommercialLeadController::class, 'index']);
    Route::get('/commercial-leads/{commercialLead}', [CommercialLeadController::class, 'show']);
    Route::patch('/commercial-leads/{commercialLead}', [CommercialLeadController::class, 'updateStatus']);
    Route::delete('/commercial-leads/{commercialLead}', [CommercialLeadController::class, 'destroy']);
});
