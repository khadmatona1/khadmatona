<?php

use App\Modules\WhatsApp\Http\Controllers\ConversationController;
use App\Modules\WhatsApp\Http\Controllers\MessageController;
use App\Modules\WhatsApp\Http\Controllers\MessageMediaController;
use App\Modules\WhatsApp\Http\Controllers\StartConversationController;
use App\Modules\WhatsApp\Http\Controllers\StatusController;
use App\Modules\WhatsApp\Http\Controllers\TemplateController;
use App\Modules\WhatsApp\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// Meta's webhook - public, no session. GET is Meta's one-time subscription
// handshake (verify token), POST carries messages/statuses and is
// authenticated by the payload signature (X-Hub-Signature-256).
Route::middleware('throttle:whatsapp-webhooks')->group(function () {
    Route::get('/webhooks/whatsapp', [WebhookController::class, 'verify'])->name('webhooks.whatsapp.verify');
    Route::post('/webhooks/whatsapp', [WebhookController::class, 'receive'])
        ->middleware('whatsapp.signature')
        ->name('webhooks.whatsapp.receive');
});

// Inbox. Admin sees every conversation; a Commercial/SeniorCommercial only
// those assigned to them (ConversationFilter/ConversationPolicy).
Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial'])->prefix('whatsapp')->group(function () {
    Route::get('/status', StatusController::class);
    Route::get('/templates', TemplateController::class);

    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations/start', StartConversationController::class)->middleware('throttle:30,1');
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::post('/conversations/{conversation}/read', [ConversationController::class, 'read']);

    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store'])->middleware('throttle:60,1');
    Route::post('/conversations/{conversation}/templates', [MessageController::class, 'storeTemplate'])->middleware('throttle:30,1');

    Route::get('/messages/{message}/media', MessageMediaController::class);
});

Route::middleware(['auth:sanctum', 'role:Admin'])->prefix('whatsapp')->group(function () {
    Route::patch('/conversations/{conversation}', [ConversationController::class, 'update']);
});
