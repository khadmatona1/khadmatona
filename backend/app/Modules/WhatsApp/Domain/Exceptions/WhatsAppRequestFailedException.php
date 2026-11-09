<?php

namespace App\Modules\WhatsApp\Domain\Exceptions;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Meta's API rejected or failed a request (invalid token, unregistered
 * recipient, template not approved, ...). Rendered as a 502 carrying Meta's
 * own reason - what an operator needs to fix it. Credentials never appear.
 */
class WhatsAppRequestFailedException extends RuntimeException
{
    public function __construct(string $message, private readonly int|string|null $metaCode = null, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }

    public function metaCode(): int|string|null
    {
        return $this->metaCode;
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error(
            __('whatsapp.request_failed', ['reason' => $this->getMessage()]),
            [],
            502,
            'whatsapp_request_failed',
        );
    }
}
