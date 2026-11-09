<?php

namespace App\Modules\WhatsApp\Http\Middleware;

use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates a Meta webhook delivery - the signature IS its auth (Meta
 * can't hold a KHADMATONA session). Meta signs the exact raw request body
 * with the app secret (HMAC-SHA256, `X-Hub-Signature-256: sha256=<hex>`), so
 * the check runs on the untouched body before anything parses it.
 *
 * Every rejection is logged with its reason to make first-time setup
 * debuggable (most often: a wrong or missing WHATSAPP_APP_SECRET).
 */
class VerifyMetaSignature
{
    public function __construct(private readonly WhatsAppGateway $gateway) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->gateway->canReceiveWebhooks()) {
            Log::warning('whatsapp.webhook.rejected', ['reason' => 'webhooks_not_configured']);

            abort(403);
        }

        if (! $this->gateway->validSignature($request->getContent(), $request->header('X-Hub-Signature-256'))) {
            Log::warning('whatsapp.webhook.rejected', [
                'reason' => 'invalid_signature',
                'has_signature_header' => $request->hasHeader('X-Hub-Signature-256'),
                'hint' => 'Check WHATSAPP_APP_SECRET matches the app the webhook is subscribed under.',
            ]);

            abort(403);
        }

        return $next($request);
    }
}
