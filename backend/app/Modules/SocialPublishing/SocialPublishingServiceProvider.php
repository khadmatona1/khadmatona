<?php

namespace App\Modules\SocialPublishing;

use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\Property\Domain\Events\PropertySocialPreferencesSubmitted;
use App\Modules\SocialPublishing\Application\Listeners\DispatchAutomaticSocialPublishing;
use App\Modules\SocialPublishing\Application\Listeners\StorePropertySocialPreferences;
use App\Modules\SocialPublishing\Domain\Contracts\MetaGraphClient;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Infrastructure\MetaGraphApiClient;
use App\Modules\SocialPublishing\Infrastructure\Repositories\EloquentSocialAccountRepository;
use App\Modules\SocialPublishing\Infrastructure\Repositories\EloquentSocialPublicationRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

/**
 * Publishes listings to a Facebook Page and an Instagram professional
 * account. Loads with no credentials and every switch off, so it stays
 * inert until an Admin connects an account and opts in.
 */
class SocialPublishingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MetaGraphClient::class, MetaGraphApiClient::class);
        $this->app->bind(SocialAccountRepositoryInterface::class, EloquentSocialAccountRepository::class);
        $this->app->bind(SocialPublicationRepositoryInterface::class, EloquentSocialPublicationRepository::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        Event::listen(PropertySocialPreferencesSubmitted::class, StorePropertySocialPreferences::class);
        Event::listen(PropertyApproved::class, DispatchAutomaticSocialPublishing::class);

        // Routes are required directly from routes/api.php.
    }
}
