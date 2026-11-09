<?php

namespace App\Core\Auth;

use App\Core\Auth\Domain\Contracts\UserRepositoryInterface;
use App\Core\Auth\Infrastructure\Repositories\EloquentUserRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class CoreAuthServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, EloquentUserRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Public auth endpoints (register/login/forgot-password/reset-password)
        // are rate-limited more strictly than authenticated ones - see
        // PROJECT_RULES.md §22.
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
