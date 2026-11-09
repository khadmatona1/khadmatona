<?php

namespace App\Modules\Blog;

use App\Modules\Blog\Domain\Contracts\PostRepositoryInterface;
use App\Modules\Blog\Infrastructure\Repositories\EloquentPostRepository;
use Illuminate\Support\ServiceProvider;

class BlogServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PostRepositoryInterface::class, EloquentPostRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.

        // The 'public-read' limiter is already registered by
        // PropertyServiceProvider - reused here, not redefined.
    }
}
