<?php

use App\Modules\Finance\Http\Controllers\FinanceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'can:access-admin-panel'])->prefix('finance')->name('finance.')->group(function () {
    Route::get('/activity', [FinanceController::class, 'activity']);
    Route::get('/dashboard', [FinanceController::class, 'report']);
    Route::get('/options', [FinanceController::class, 'options']);
    Route::post('/entries', [FinanceController::class, 'store']);
    Route::put('/entries/{entry}', [FinanceController::class, 'update']);
    Route::delete('/entries/{entry}', [FinanceController::class, 'destroy']);
});
