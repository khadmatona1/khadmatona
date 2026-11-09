<?php

namespace App\Modules\WhatsApp\Domain\Exceptions;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A WhatsApp action was attempted without Meta credentials. Rendered as a
 * clean 503 (`whatsapp_not_configured`) - the documented "feature is off"
 * state, never a 500.
 */
class WhatsAppNotConfiguredException extends RuntimeException
{
    public static function make(): self
    {
        return new self(__('whatsapp.not_configured'));
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error($this->getMessage(), [], 503, 'whatsapp_not_configured');
    }
}
