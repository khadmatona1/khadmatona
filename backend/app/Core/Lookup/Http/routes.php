<?php

use App\Core\Lookup\Http\Controllers\CityController;
use App\Core\Lookup\Http\Controllers\DistrictController;
use Illuminate\Support\Facades\Route;

// Public, read-only reference data - feeds the city/district <select>s on
// both the public search filters and the admin property form.
Route::middleware('throttle:public-read')->group(function () {
    Route::get('/cities', [CityController::class, 'index']);
    Route::get('/districts', [DistrictController::class, 'index']);
});
