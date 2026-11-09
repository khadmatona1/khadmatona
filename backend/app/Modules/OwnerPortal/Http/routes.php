<?php

use App\Modules\OwnerPortal\Http\Controllers\OwnerPropertyController;
use App\Modules\OwnerPortal\Http\Controllers\OwnerReportController;
use Illuminate\Support\Facades\Route;

// Espace Propriétaire - entirely read-only, Owner-only. No public route,
// no mutate route: "ghir iechof" (view only).
Route::middleware(['auth:sanctum', 'role:Owner'])->prefix('owner')->group(function () {
    Route::get('/properties', [OwnerPropertyController::class, 'index']);
    Route::get('/properties/{property}', [OwnerPropertyController::class, 'show']);
    Route::get('/reports/monthly', [OwnerReportController::class, 'monthly']);
});
