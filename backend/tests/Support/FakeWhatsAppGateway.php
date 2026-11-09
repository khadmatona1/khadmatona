<?php

namespace Tests\Support;

use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;

/** In-memory stand-in for Meta's API: records what would have been sent. */
class FakeWhatsAppGateway implements WhatsAppGateway
{
    public bool $configured = true;

    public bool $webhooks = true;

    public ?string $phoneNumberId = '111222333';

    /** @var array<int, array{to: string, body: string}> */
    public array $texts = [];

    /** @var array<int, array{to: string, name: string, language: string, params: array<int, string>}> */
    public array $templates = [];

    /** @var array<int, string> */
    public array $readReceipts = [];

    public ?WhatsAppRequestFailedException $failNextSend = null;

    /** @var array{content: string, mime: string} */
    public array $media = ['content' => 'PNGDATA', 'mime' => 'image/png'];

    private int $counter = 0;

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    public function canReceiveWebhooks(): bool
    {
        return $this->webhooks;
    }

    public function phoneNumberId(): ?string
    {
        return $this->phoneNumberId;
    }

    public function verifyToken(): ?string
    {
        return 'verify-me';
    }

    public function validSignature(string $rawBody, ?string $signatureHeader): bool
    {
        return true;
    }

    public function sendText(string $toWaId, string $body): array
    {
        $this->guard();
        $this->texts[] = ['to' => $toWaId, 'body' => $body];

        return ['id' => 'wamid.FAKE'.++$this->counter];
    }

    public function sendTemplate(string $toWaId, string $name, string $language, array $bodyParams = []): array
    {
        $this->guard();
        $this->templates[] = ['to' => $toWaId, 'name' => $name, 'language' => $language, 'params' => $bodyParams];

        return ['id' => 'wamid.FAKE'.++$this->counter];
    }

    public function markRead(string $waMessageId): void
    {
        $this->readReceipts[] = $waMessageId;
    }

    public function downloadMedia(string $mediaId): array
    {
        if (! $this->configured) {
            throw WhatsAppNotConfiguredException::make();
        }

        return $this->media;
    }

    public function listTemplates(): array
    {
        return [['name' => 'hello_world', 'language' => 'en_US', 'status' => 'APPROVED', 'body_params' => 0]];
    }

    private function guard(): void
    {
        if (! $this->configured) {
            throw WhatsAppNotConfiguredException::make();
        }

        if ($this->failNextSend) {
            $e = $this->failNextSend;
            $this->failNextSend = null;

            throw $e;
        }
    }
}
