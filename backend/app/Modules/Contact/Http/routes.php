<?php

use App\Modules\Contact\Http\Controllers\ContactController;
use Illuminate\Support\Facades\Route;

// Contacts are purely internal (buyers/sellers/tenants/landlords) - no
// public/unauthenticated route exists at all, unlike Property/Lead. Admin
// sees every contact; a Commercial/SeniorCommercial sees only their own
// (ContactFilter/ContactPolicy).
Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial'])->group(function () {
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::get('/contacts/{contact}', [ContactController::class, 'show']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::put('/contacts/{contact}', [ContactController::class, 'update']);
    Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);
});
