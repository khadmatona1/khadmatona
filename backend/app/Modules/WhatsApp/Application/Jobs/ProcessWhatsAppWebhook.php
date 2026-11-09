<?php

namespace App\Modules\WhatsApp\Application\Jobs;

use App\Modules\WhatsApp\Application\InboundWebhookProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Webhook bodies are processed off the request thread: Meta expects a fast
 * 200, and a slow database write must never make it retry (and duplicate)
 * the delivery. Processing is idempotent, so a queue retry is safe too.
 */
class ProcessWhatsAppWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public readonly array $payload) {}

    public function handle(InboundWebhookProcessor $processor): void
    {
        $processor->process($this->payload);
    }
}
