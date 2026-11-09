<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Core\Support\Phone\PhoneNumber;
use App\Modules\WhatsApp\Application\ConversationService;
use App\Modules\WhatsApp\Application\WhatsAppMessenger;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Http\Requests\StartConversationRequest;
use App\Modules\WhatsApp\Http\Resources\ConversationResource;
use App\Modules\WhatsApp\Http\Resources\MessageResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Opens (or re-opens) a thread by sending an approved template - the only
 * message WhatsApp lets a business send to someone who hasn't written first.
 */
class StartConversationController
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly WhatsAppMessenger $messenger,
        private readonly WhatsAppGateway $gateway,
    ) {}

    public function __invoke(StartConversationRequest $request): JsonResponse
    {
        // Checked first so an unconfigured install never leaves an orphan thread behind.
        if (! $this->gateway->isConfigured()) {
            throw WhatsAppNotConfiguredException::make();
        }

        $waId = ltrim((string) PhoneNumber::toE164($request->validated('phone')), '+');
        $conversation = $this->conversations->findOrCreate($waId, $request->validated('contact_name'), $request->user());

        // A Commercial can start new threads (assigned to them) but must not
        // hijack an existing one that belongs to someone else / is unassigned.
        Gate::authorize('reply', $conversation);

        $message = $this->messenger->sendTemplate(
            $conversation,
            $request->validated('name') ?: config('services.whatsapp.default_template'),
            $request->validated('language') ?: config('services.whatsapp.default_template_language'),
            $request->validated('params') ?? [],
            MessageSenderType::Agent,
            $request->user(),
        );

        return ApiResponse::success([
            'conversation' => (new ConversationResource($conversation->refresh()->load('assignedUser')))->resolve(),
            'message' => (new MessageResource($message->load('senderUser')))->resolve(),
        ], status: 201);
    }
}
