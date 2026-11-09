<?php

namespace App\Core\Localization;

use Illuminate\Support\ServiceProvider;

class CoreLocalizationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
