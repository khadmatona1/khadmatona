<?php

namespace App\Modules\Rental;

use App\Modules\Rental\Domain\Contracts\BookingRequestRepository;
use App\Modules\Rental\Domain\Contracts\CleaningRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ExpenseRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\MaintenanceRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Contracts\ReservationRepositoryInterface;
use App\Modules\Rental\Infrastructure\Repositories\EloquentBookingRequestRepository;
use App\Modules\Rental\Infrastructure\Repositories\EloquentCleaningRepository;
use App\Modules\Rental\Infrastructure\Repositories\EloquentExpenseRepository;
use App\Modules\Rental\Infrastructure\Repositories\EloquentMaintenanceRepository;
use App\Modules\Rental\Infrastructure\Repositories\EloquentManagedPropertyRepository;
use App\Modules\Rental\Infrastructure\Repositories\EloquentReservationRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Gestion locative & Conciergerie: managed properties, reservations,
 * check-in/out, cleaning, maintenance, expenses and the monthly
 * owner / KHADMATONA statement.
 *
 * Reads the catalog only through PropertyRepositoryInterface (titles, owner
 * scoping) - no Property model import, no cross-module relation
 * (PROJECT_RULES.md §3).
 */
class RentalServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BookingRequestRepository::class, EloquentBookingRequestRepository::class);
        $this->app->bind(ManagedPropertyRepositoryInterface::class, EloquentManagedPropertyRepository::class);
        $this->app->bind(ReservationRepositoryInterface::class, EloquentReservationRepository::class);
        $this->app->bind(CleaningRepositoryInterface::class, EloquentCleaningRepository::class);
        $this->app->bind(MaintenanceRepositoryInterface::class, EloquentMaintenanceRepository::class);
        $this->app->bind(ExpenseRepositoryInterface::class, EloquentExpenseRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
