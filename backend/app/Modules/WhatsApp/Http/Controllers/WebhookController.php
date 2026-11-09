<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Modules\WhatsApp\Application\Jobs\ProcessWhatsAppWebhook;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Meta's two webhook calls. Both are public - GET is protected by the shared
 * verify token, POST by the payload signature (VerifyMetaSignature).
 */
class WebhookController
{
    public function __construct(private readonly WhatsAppGateway $gateway) {}

    /**
     * Subscription handshake: Meta calls this once when the webhook URL is
     * saved in the developer console and expects the challenge echoed back.
     * (PHP rewrites the dots in `hub.mode` etc. to underscores.)
     */
    public function verify(Request $request): Response
    {
        $expected = $this->gateway->verifyToken();
        $token = (string) $request->query('hub_verify_token', '');

        if ($request->query('hub_mode') !== 'subscribe' || $expected === null || ! hash_equals($expected, $token)) {
            Log::warning('whatsapp.webhook.verify_failed', [
                'reason' => $expected === null ? 'verify_token_not_configured' : 'token_mismatch',
            ]);

            abort(403);
        }

        return response((string) $request->query('hub_challenge', ''), 200, ['Content-Type' => 'text/plain']);
    }

    public function receive(Request $request): JsonResponse
    {
        // Acknowledge immediately, process on the queue - see ProcessWhatsAppWebhook.
        ProcessWhatsAppWebhook::dispatch($request->json()->all());

        return response()->json(['success' => true]);
    }
}
