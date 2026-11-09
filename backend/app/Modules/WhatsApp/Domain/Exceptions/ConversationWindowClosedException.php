<?php

namespace App\Modules\WhatsApp\Domain\Exceptions;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * WhatsApp only allows free-form messages within 24h of the customer's last
 * message; outside that window only an approved template can be sent.
 */
class ConversationWindowClosedException extends RuntimeException
{
    public static function make(): self
    {
        return new self(__('whatsapp.window_closed'));
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error($this->getMessage(), [], 422, 'whatsapp_window_closed');
    }
}
