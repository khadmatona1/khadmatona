<?php

namespace App\Modules\Lookup;

use Illuminate\Support\ServiceProvider;

class LookupServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Repository interface -> Eloquent implementation bindings land
        // here once the module has models to bind.
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
