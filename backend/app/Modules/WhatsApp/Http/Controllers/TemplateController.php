<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use Illuminate\Http\JsonResponse;

/** Approved templates from the WhatsApp Business Account, for the "start conversation" picker. */
class TemplateController
{
    public function __construct(private readonly WhatsAppGateway $gateway) {}

    public function __invoke(): JsonResponse
    {
        return ApiResponse::success($this->gateway->listTemplates());
    }
}
