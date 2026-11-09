<?php

use App\Modules\Task\Http\Controllers\DailyReportController;
use App\Modules\Task\Http\Controllers\TaskController;
use App\Modules\Task\Http\Controllers\WeeklyReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:Admin|Commercial|SeniorCommercial'])->group(function () {
    Route::get('/daily-reports', [DailyReportController::class, 'index']);
    Route::post('/daily-reports', [DailyReportController::class, 'store']);
    Route::get('/weekly-reports', [WeeklyReportController::class, 'index']);
    Route::post('/weekly-reports', [WeeklyReportController::class, 'store']);
    Route::get('/tasks/options', [TaskController::class, 'options']);
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
});
