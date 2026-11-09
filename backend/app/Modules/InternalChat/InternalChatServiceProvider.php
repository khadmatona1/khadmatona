<?php

namespace App\Modules\InternalChat;

use Illuminate\Support\ServiceProvider;

class InternalChatServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
