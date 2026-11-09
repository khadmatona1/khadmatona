<?php

namespace App\Core\Permissions;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class CorePermissionsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Admin holds every permission implicitly, so new permissions never
        // need a matching seeder update just to keep Admin working.
        Gate::before(function (Authenticatable $user, string $ability) {
            return method_exists($user, 'hasRole') && $user->hasRole('Admin') ? true : null;
        });

        Gate::define('access-admin-panel', function (Authenticatable $user) {
            return method_exists($user, 'hasRole') && $user->hasRole('Admin');
        });
    }
}
