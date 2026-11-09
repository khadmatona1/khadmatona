<?php

use App\Modules\InternalChat\Http\Controllers\InternalChatController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial'])->group(function () {
    Route::get('/internal-chat/contacts', [InternalChatController::class, 'contacts']);
    Route::get('/internal-chat/messages', [InternalChatController::class, 'index']);
    Route::post('/internal-chat/messages', [InternalChatController::class, 'store'])->middleware('throttle:60,1');
    Route::post('/internal-chat/read', [InternalChatController::class, 'read']);
});
