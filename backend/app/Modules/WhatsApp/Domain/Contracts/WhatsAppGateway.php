<?php

namespace App\Modules\WhatsApp\Domain\Contracts;

use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;

/**
 * Everything the app needs from the WhatsApp provider. Meta's Cloud API is
 * the only implementation (Infrastructure\MetaCloudApiGateway); the module
 * depends on this contract so tests bind a fake and moving between Meta's
 * test number and a production number is purely configuration.
 */
interface WhatsAppGateway
{
    /** Access token + phone number id present: we can send and fetch media. */
    public function isConfigured(): bool;

    /** App secret + verify token present: incoming webhooks can be trusted. */
    public function canReceiveWebhooks(): bool;

    public function phoneNumberId(): ?string;

    /** The token Meta echoes during webhook subscription (GET challenge). */
    public function verifyToken(): ?string;

    /** Checks an `X-Hub-Signature-256` header against the raw request body. */
    public function validSignature(string $rawBody, ?string $signatureHeader): bool;

    /**
     * @return array{id: string}  Meta's message id (wamid...)
     *
     * @throws WhatsAppNotConfiguredException
     * @throws WhatsAppRequestFailedException
     */
    public function sendText(string $toWaId, string $body): array;

    /**
     * @param  array<int, string>  $bodyParams  Values for {{1}}, {{2}}, ... in the template body.
     * @return array{id: string}
     *
     * @throws WhatsAppNotConfiguredException
     * @throws WhatsAppRequestFailedException
     */
    public function sendTemplate(string $toWaId, string $name, string $language, array $bodyParams = []): array;

    /** Tells Meta an inbound message was read (blue ticks for the customer). Best-effort. */
    public function markRead(string $waMessageId): void;

    /**
     * @return array{content: string, mime: string}
     *
     * @throws WhatsAppNotConfiguredException
     * @throws WhatsAppRequestFailedException
     */
    public function downloadMedia(string $mediaId): array;

    /**
     * Approved message templates on the WhatsApp Business Account (empty when
     * the business account id isn't configured).
     *
     * @return array<int, array{name: string, language: string, status: string, body_params: int}>
     *
     * @throws WhatsAppRequestFailedException
     */
    public function listTemplates(): array;
}
