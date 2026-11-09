<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * What the dashboard reads to decide between the inbox and the
 * "WhatsApp is not configured" state. Never exposes credentials; the webhook
 * URL to paste into Meta's console is Admin-only.
 */
class StatusController
{
    public function __construct(private readonly WhatsAppGateway $gateway) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = [
            'configured' => $this->gateway->isConfigured(),
            'webhooks_ready' => $this->gateway->canReceiveWebhooks(),
            'ai_enabled' => (bool) config('services.whatsapp.ai_enabled'),
            'default_template' => [
                'name' => config('services.whatsapp.default_template'),
                'language' => config('services.whatsapp.default_template_language'),
            ],
        ];

        if ($request->user()?->hasRole('Admin')) {
            $base = config('services.whatsapp.webhook_base_url') ?: config('app.url');
            $data['webhook_url'] = rtrim((string) $base, '/').route('webhooks.whatsapp.receive', [], false);
        }

        return ApiResponse::success($data);
    }
}
