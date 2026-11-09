<?php

namespace App\Modules\WhatsApp\Infrastructure;

use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta WhatsApp Cloud API (graph.facebook.com), called directly over HTTP -
 * no vendor SDK.
 *
 * Config is read from `services.whatsapp` on EVERY call, never captured in a
 * constructor, so switching from Meta's test number to a production number
 * (a .env change + config reload) needs no code change and the
 * container-bound singleton can never hold stale values.
 */
class MetaCloudApiGateway implements WhatsAppGateway
{
    public function isConfigured(): bool
    {
        return filled($this->config('access_token')) && filled($this->config('phone_number_id'));
    }

    public function canReceiveWebhooks(): bool
    {
        return filled($this->config('app_secret')) && filled($this->config('verify_token'));
    }

    public function phoneNumberId(): ?string
    {
        $id = $this->config('phone_number_id');

        return filled($id) ? (string) $id : null;
    }

    public function verifyToken(): ?string
    {
        $token = $this->config('verify_token');

        return filled($token) ? (string) $token : null;
    }

    public function validSignature(string $rawBody, ?string $signatureHeader): bool
    {
        $secret = $this->config('app_secret');

        if (blank($secret) || blank($signatureHeader)) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $rawBody, (string) $secret);

        return hash_equals($expected, $signatureHeader);
    }

    public function sendText(string $toWaId, string $body): array
    {
        return $this->sendMessage([
            'to' => $toWaId,
            'type' => 'text',
            'text' => ['preview_url' => false, 'body' => $body],
        ]);
    }

    public function sendTemplate(string $toWaId, string $name, string $language, array $bodyParams = []): array
    {
        $template = ['name' => $name, 'language' => ['code' => $language]];

        if ($bodyParams !== []) {
            $template['components'] = [[
                'type' => 'body',
                'parameters' => array_map(
                    fn (string $value) => ['type' => 'text', 'text' => $value],
                    array_values($bodyParams),
                ),
            ]];
        }

        return $this->sendMessage(['to' => $toWaId, 'type' => 'template', 'template' => $template]);
    }

    public function markRead(string $waMessageId): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $this->send(fn (PendingRequest $http) => $http->post($this->phoneUrl('messages'), [
                'messaging_product' => 'whatsapp',
                'status' => 'read',
                'message_id' => $waMessageId,
            ]), 'mark_read');
        } catch (WhatsAppRequestFailedException) {
            // Read receipts are cosmetic - already logged, never worth failing the caller.
        }
    }

    public function downloadMedia(string $mediaId): array
    {
        $this->ensureConfigured();

        // Two hops by design: the media id resolves to a short-lived URL
        // (valid ~5 minutes) which must then be fetched with the same token.
        $meta = $this->send(fn (PendingRequest $http) => $http->get($this->url($mediaId)), 'media_lookup')->json();
        $url = $meta['url'] ?? null;

        if (! is_string($url) || $url === '') {
            throw new WhatsAppRequestFailedException('Media URL missing from the Meta response.');
        }

        $file = $this->send(fn (PendingRequest $http) => $http->get($url), 'media_download');

        return [
            'content' => $file->body(),
            'mime' => (string) ($meta['mime_type'] ?? ($file->header('Content-Type') ?: 'application/octet-stream')),
        ];
    }

    public function listTemplates(): array
    {
        $wabaId = $this->config('business_account_id');

        if (! $this->isConfigured() || blank($wabaId)) {
            return [];
        }

        $response = $this->send(fn (PendingRequest $http) => $http->get($this->url("{$wabaId}/message_templates"), [
            'fields' => 'name,language,status,components',
            'limit' => 100,
        ]), 'list_templates');

        return collect($response->json('data', []))
            ->filter(fn (array $t) => ($t['status'] ?? null) === 'APPROVED')
            ->map(function (array $t) {
                $body = collect($t['components'] ?? [])->firstWhere('type', 'BODY');
                preg_match_all('/\{\{\d+\}\}/', (string) ($body['text'] ?? ''), $matches);

                return [
                    'name' => (string) $t['name'],
                    'language' => (string) $t['language'],
                    'status' => (string) $t['status'],
                    'body_params' => count(array_unique($matches[0])),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $message
     * @return array{id: string}
     */
    private function sendMessage(array $message): array
    {
        $this->ensureConfigured();

        $response = $this->send(fn (PendingRequest $http) => $http->post($this->phoneUrl('messages'), [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            ...$message,
        ]), 'send_'.$message['type']);

        $id = $response->json('messages.0.id');

        if (! is_string($id) || $id === '') {
            Log::warning('whatsapp.unexpected_response', ['operation' => 'send_'.$message['type']]);
            throw new WhatsAppRequestFailedException('Meta accepted the request but returned no message id.');
        }

        return ['id' => $id];
    }

    /**
     * Runs one HTTP call against Meta, turning transport failures and Meta's
     * error envelope ({"error": {"message", "code", ...}}) into a
     * WhatsAppRequestFailedException - logged without credentials or message
     * bodies (customer PII), so callers only ever see our own exceptions.
     *
     * @param  callable(PendingRequest): Response  $call
     */
    private function send(callable $call, string $operation): Response
    {
        try {
            $response = $call(
                Http::withToken((string) $this->config('access_token'))->acceptJson()->timeout(20),
            );
        } catch (ConnectionException $e) {
            Log::warning('whatsapp.connection_failed', ['operation' => $operation, 'message' => $e->getMessage()]);

            throw new WhatsAppRequestFailedException('Could not reach the WhatsApp Cloud API.', null, $e);
        }

        if ($response->failed()) {
            $error = $response->json('error', []);
            $message = (string) ($error['error_user_msg'] ?? $error['message'] ?? 'Unknown WhatsApp Cloud API error.');
            $code = $error['code'] ?? $response->status();

            Log::warning('whatsapp.request_failed', [
                'operation' => $operation,
                'http_status' => $response->status(),
                'meta_code' => $code,
                'meta_subcode' => $error['error_subcode'] ?? null,
                'fbtrace_id' => $error['fbtrace_id'] ?? null,
                'message' => $message,
            ]);

            throw new WhatsAppRequestFailedException($message, $code);
        }

        return $response;
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw WhatsAppNotConfiguredException::make();
        }
    }

    private function phoneUrl(string $path): string
    {
        return $this->url($this->phoneNumberId().'/'.$path);
    }

    private function url(string $path): string
    {
        $version = $this->config('api_version') ?: 'v21.0';

        return "https://graph.facebook.com/{$version}/".ltrim($path, '/');
    }

    private function config(string $key): mixed
    {
        return config("services.whatsapp.{$key}");
    }
}
