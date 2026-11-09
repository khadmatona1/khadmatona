<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\WhatsApp\Application\WhatsAppMessenger;
use App\Modules\WhatsApp\Domain\Contracts\MessageRepositoryInterface;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Http\Requests\SendMessageRequest;
use App\Modules\WhatsApp\Http\Requests\SendTemplateRequest;
use App\Modules\WhatsApp\Http\Resources\MessageResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MessageController
{
    public function __construct(
        private readonly MessageRepositoryInterface $messages,
        private readonly WhatsAppMessenger $messenger,
    ) {}

    /**
     * The conversation's history, oldest-first: the newest `limit` messages,
     * or - with `before_id` - the page of older ones before that message.
     */
    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);

        $page = $this->messages->page(
            $conversation->id,
            $request->filled('before_id') ? $request->integer('before_id') : null,
            max(1, min(100, $request->integer('limit', 50))),
        );

        return ApiResponse::success(
            MessageResource::collection($page['messages'])->resolve(),
            ['has_more' => $page['has_more']],
        );
    }

    public function store(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('reply', $conversation);

        $message = $this->messenger->sendText(
            $conversation,
            $request->validated('body'),
            MessageSenderType::Agent,
            $request->user(),
        );

        return ApiResponse::success(new MessageResource($message->load('senderUser')), status: 201);
    }

    public function storeTemplate(SendTemplateRequest $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('reply', $conversation);

        $message = $this->messenger->sendTemplate(
            $conversation,
            $request->validated('name'),
            $request->validated('language'),
            $request->validated('params') ?? [],
            MessageSenderType::Agent,
            $request->user(),
        );

        return ApiResponse::success(new MessageResource($message->load('senderUser')), status: 201);
    }
}
