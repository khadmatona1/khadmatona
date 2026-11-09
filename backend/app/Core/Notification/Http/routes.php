<?php

use App\Core\Notification\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

// Not role-restricted by design - always scoped to $request->user()'s own
// notifications (NotificationController), so any authenticated role can
// use it as more notification types are added later. Today only Admin
// ever actually receives one (NewPropertyPendingApproval).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
});
