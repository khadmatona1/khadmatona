<?php

namespace App\Modules\Reviews;

use App\Modules\Reviews\Domain\Contracts\ReviewsProviderInterface;
use App\Modules\Reviews\Infrastructure\GooglePlacesReviewsProvider;
use Illuminate\Support\ServiceProvider;

class ReviewsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ReviewsProviderInterface::class, GooglePlacesReviewsProvider::class);
    }

    public function boot(): void
    {
        // No migrations - this module has no persistence of its own, it's
        // a read-through cache in front of the Google Places API.

        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
