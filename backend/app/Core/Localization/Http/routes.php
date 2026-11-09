<?php

use App\Core\Localization\Http\Controllers\I18nController;
use Illuminate\Support\Facades\Route;

// Unauthenticated and public like every other read endpoint - same
// throttle limiter Property registers, so no new RateLimiter::for() call
// is needed here.
Route::middleware('throttle:public-read')->get('/i18n/{locale}', I18nController::class);
