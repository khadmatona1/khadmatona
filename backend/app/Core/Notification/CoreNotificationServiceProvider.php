<?php

namespace App\Core\Notification;

use Illuminate\Support\ServiceProvider;

/**
 * Cross-cutting notification delivery (mail + in-app/database channel),
 * consumed by any module that needs to tell a user something happened -
 * the first consumer is Property's "new listing pending approval" notice
 * to Admins.
 */
class CoreNotificationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
