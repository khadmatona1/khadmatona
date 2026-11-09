<?php

namespace App\Modules\WhatsApp;

use App\Modules\WhatsApp\Application\Listeners\AttemptAutoReply;
use App\Modules\WhatsApp\Application\Listeners\NotifyStaffOfInboundMessage;
use App\Modules\WhatsApp\Domain\Contracts\AutoReplyStrategy;
use App\Modules\WhatsApp\Domain\Contracts\ConversationRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\CustomerDirectory;
use App\Modules\WhatsApp\Domain\Contracts\MessageRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Events\WhatsAppMessageReceived;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Http\Middleware\VerifyMetaSignature;
use App\Modules\WhatsApp\Http\Policies\ConversationPolicy;
use App\Modules\WhatsApp\Infrastructure\DatabaseCustomerDirectory;
use App\Modules\WhatsApp\Infrastructure\MetaCloudApiGateway;
use App\Modules\WhatsApp\Infrastructure\NullAutoReplyStrategy;
use App\Modules\WhatsApp\Infrastructure\Repositories\EloquentConversationRepository;
use App\Modules\WhatsApp\Infrastructure\Repositories\EloquentMessageRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * WhatsApp Business (Meta Cloud API): inbound webhooks, full conversation
 * history, and dashboard replies. Loads with no credentials - the gateway
 * simply reports isConfigured() === false and every consumer degrades to the
 * "not configured" state.
 *
 * To connect an AI later: implement Domain\Contracts\AutoReplyStrategy and
 * change the binding below (nothing else needs to change).
 */
class WhatsAppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(WhatsAppGateway::class, MetaCloudApiGateway::class);
        $this->app->bind(ConversationRepositoryInterface::class, EloquentConversationRepository::class);
        $this->app->bind(MessageRepositoryInterface::class, EloquentMessageRepository::class);
        $this->app->bind(CustomerDirectory::class, DatabaseCustomerDirectory::class);

        // <- the AI seam: swap NullAutoReplyStrategy for a real implementation.
        $this->app->bind(AutoReplyStrategy::class, NullAutoReplyStrategy::class);
    }

    public function boot(Router $router): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');

        Gate::policy(Conversation::class, ConversationPolicy::class);

        $router->aliasMiddleware('whatsapp.signature', VerifyMetaSignature::class);

        Event::listen(WhatsAppMessageReceived::class, NotifyStaffOfInboundMessage::class);
        Event::listen(WhatsAppMessageReceived::class, AttemptAutoReply::class);

        // Meta delivers from a shared pool and can burst (a status callback
        // per message) - far looser than the public capture limiters; the
        // signature check is the real gate.
        RateLimiter::for('whatsapp-webhooks', function (Request $request) {
            return Limit::perMinute(300)->by($request->ip());
        });

        // Routes are required directly from routes/api.php.
    }
}
