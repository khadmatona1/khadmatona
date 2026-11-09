<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * Authenticated proxy for a message's attachment. Meta's media URLs expire
 * within minutes and need our access token, so the browser can never use
 * them directly - it asks us, we check the caller may see the conversation,
 * fetch the file, and stream it back.
 *
 * The response is locked down: only safe inline types are rendered inline,
 * everything else downloads as an opaque attachment, and a sandboxed CSP +
 * nosniff stop a hostile customer-supplied file from executing here.
 */
class MessageMediaController
{
    public function __construct(private readonly WhatsAppGateway $gateway) {}

    public function __invoke(Message $message): Response
    {
        Gate::authorize('view', $message->conversation);

        $mediaId = $message->mediaId();
        abort_if($mediaId === null, 404);

        $file = $this->gateway->downloadMedia($mediaId);
        $mime = strtolower(trim(explode(';', $file['mime'])[0]));
        $inline = preg_match('#^(image/(jpeg|png|webp|gif)|audio/[a-z0-9.+-]+|video/(mp4|3gpp)|application/pdf)$#', $mime) === 1;
        $filename = preg_replace('/[^A-Za-z0-9._-]/', '_', (string) ($message->payload['filename'] ?? 'attachment-'.$message->id));

        return response($file['content'], 200, [
            'Content-Type' => $inline ? $mime : 'application/octet-stream',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
