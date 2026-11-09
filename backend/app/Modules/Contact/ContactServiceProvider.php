<?php

namespace App\Modules\Contact;

use App\Modules\Contact\Domain\Contracts\ContactRepositoryInterface;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Contact\Http\Policies\ContactPolicy;
use App\Modules\Contact\Infrastructure\Repositories\EloquentContactRepository;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class ContactServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ContactRepositoryInterface::class, EloquentContactRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        Gate::policy(Contact::class, ContactPolicy::class);

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
