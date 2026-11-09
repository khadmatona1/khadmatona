<?php

use App\Modules\Rental\Http\Controllers\BookingRequestController;
use App\Modules\Rental\Http\Controllers\CleaningController;
use App\Modules\Rental\Http\Controllers\ExpenseController;
use App\Modules\Rental\Http\Controllers\MaintenanceController;
use App\Modules\Rental\Http\Controllers\ManagedPropertyController;
use App\Modules\Rental\Http\Controllers\OwnerRentalController;
use App\Modules\Rental\Http\Controllers\RentalReportController;
use App\Modules\Rental\Http\Controllers\ReservationController;
use App\Modules\Rental\Http\Controllers\StayContractController;
use Illuminate\Support\Facades\Route;

Route::get('/rental/booking-properties', [BookingRequestController::class, 'catalog'])
    ->middleware('throttle:public-read');

Route::get('/rental/booking/{propertyId}', [BookingRequestController::class, 'availability'])
    ->whereNumber('propertyId')->middleware('throttle:public-read');
Route::post('/rental/booking-requests', [BookingRequestController::class, 'store'])
    ->middleware('throttle:5,60');
Route::get('/rental/stay-contracts/{token}', [StayContractController::class, 'show'])
    ->where('token', '[A-Za-z0-9]{64}')->middleware('throttle:public-read');
Route::post('/rental/stay-contracts/{token}/sign', [StayContractController::class, 'sign'])
    ->where('token', '[A-Za-z0-9]{64}')->middleware('throttle:5,60');

// Rental back office: Admin sees all; commercials see only assigned properties.
// Namespace resource names as well as URLs: properties.index already belongs
// to the public catalog, and duplicate names prevent production route caching.
Route::middleware(['auth:sanctum', 'role:Admin|SeniorCommercial|Commercial'])->prefix('rental')->name('rental.')->group(function () {
    Route::patch('/properties/{managedProperty}/approve', [ManagedPropertyController::class, 'approve'])->middleware('role:Admin');
    Route::patch('/properties/{managedProperty}/reject', [ManagedPropertyController::class, 'reject'])->middleware('role:Admin');
    Route::get('/booking-requests', [BookingRequestController::class, 'index']);
    Route::patch('/booking-requests/{bookingRequest}/confirm', [BookingRequestController::class, 'confirm']);
    Route::patch('/booking-requests/{bookingRequest}/reject', [BookingRequestController::class, 'reject']);
    Route::get('/dashboard', [RentalReportController::class, 'dashboard']);
    Route::get('/statement', [RentalReportController::class, 'statement']);

    Route::apiResource('properties', ManagedPropertyController::class)
        ->parameters(['properties' => 'managedProperty']);

    Route::apiResource('reservations', ReservationController::class);
    Route::patch('/reservations/{reservation}/check-in', [ReservationController::class, 'checkIn']);
    Route::patch('/reservations/{reservation}/check-out', [ReservationController::class, 'checkOut']);
    Route::patch('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);

    Route::apiResource('cleanings', CleaningController::class)->except(['show']);
    Route::apiResource('maintenance', MaintenanceController::class)->except(['show'])
        ->parameters(['maintenance' => 'maintenance']);
    Route::apiResource('expenses', ExpenseController::class)->except(['show']);
});

// Espace Propriétaire: read-only view of their own properties' rental
// revenue - never guest identities, never another owner's properties.
Route::middleware(['auth:sanctum', 'role:Owner'])->prefix('owner/rental')->group(function () {
    Route::get('/statement', [OwnerRentalController::class, 'statement']);
    Route::get('/reservations', [OwnerRentalController::class, 'reservations']);
});
