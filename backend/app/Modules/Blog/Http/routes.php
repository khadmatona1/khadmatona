<?php

use App\Modules\Blog\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

// Public showcase site: unauthenticated reads (published-only for guests;
// an authenticated Admin hitting these same routes also sees drafts - see
// PostController's class docblock). Same public-read limiter Property
// already registers.
//
// No separate admin "GET by id" route exists on purpose: Laravel's router
// keys routes by `method + URI text`, and `{post:slug}` vs `{post}` both
// compile to the identical URI text `posts/{post}` - a second GET route
// registered here would silently overwrite this one instead of coexisting
// (confirmed via `php artisan route:list`, which only ever shows one).
// The admin dashboard's edit page therefore fetches by slug too, reusing
// this same route - PostController::show() already returns drafts to an
// authenticated Admin, so nothing else needs to change.
Route::middleware('throttle:public-read')->group(function () {
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{post:slug}', [PostController::class, 'show']);
});

// Admin back-office: full CRUD behind Sanctum + the Admin role. Numeric-id
// binding here (the default) for mutations - PUT/DELETE don't collide with
// the GET route above since they're different HTTP methods.
Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{post}', [PostController::class, 'update']);
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);
});
