<?php

use App\Modules\Reviews\Http\Controllers\ReviewsController;
use Illuminate\Support\Facades\Route;

// Public showcase site reads reviews unauthenticated - same throttle
// limiter Property already registers, so no new RateLimiter::for() call
// is needed here.
Route::middleware('throttle:public-read')->get('/reviews', [ReviewsController::class, 'index']);
