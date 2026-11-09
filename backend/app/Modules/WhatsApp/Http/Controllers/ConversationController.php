<?php

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Core\Notification\Notifications\WhatsAppMessageReceivedNotification;
use App\Core\Support\Http\ApiResponse;
use App\Modules\WhatsApp\Domain\Contracts\ConversationRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\MessageRepositoryInterface;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Http\Filters\ConversationFilter;
use App\Modules\WhatsApp\Http\Requests\UpdateConversationRequest;
use App\Modules\WhatsApp\Http\Resources\ConversationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Simple CRUD-adjacent controller, no Service layer (PROJECT_RULES.md §6
 * carve-out) - anything with real logic (sending, webhook processing) lives
 * in Application/. Listing scope: ConversationFilter; single-record access:
 * ConversationPolicy.
 */
class ConversationController
{
    public function __construct(
        private readonly ConversationRepositoryInterface $conversations,
        private readonly MessageRepositoryInterface $messages,
        private readonly WhatsAppGateway $gateway,
    ) {}

    public function index(Request $request, ConversationFilter $filter): JsonResponse
    {
        $conversations = $filter->apply()
            ->with('assignedUser')
            ->orderByDesc('last_message_at')
            ->paginate($request->integer('per_page', 30));

        return ApiResponse::success(
            ConversationResource::collection($conversations)->resolve(),
            ['pagination' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ]]
        );
    }

    public function show(Conversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);

        return ApiResponse::success(new ConversationResource($conversation->load('assignedUser')));
    }

    /**
     * Agent opened the thread: clears the unread badge, the matching bell
     * notification, and (best-effort) sends Meta a read receipt so the
     * customer sees blue ticks.
     */
    public function read(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('reply', $conversation);

        $latestInbound = $this->messages->latestInboundWaMessageId($conversation->id);
        $conversation = $this->conversations->update($conversation, ['unread_count' => 0]);

        if ($latestInbound !== null) {
            $this->gateway->markRead($latestInbound);
        }

        $request->user()->unreadNotifications()
            ->where('type', WhatsAppMessageReceivedNotification::class)
            ->get()
            ->filter(fn ($n) => ($n->data['conversation_id'] ?? null) === $conversation->id)
            ->each->markAsRead();

        return ApiResponse::success(new ConversationResource($conversation->load('assignedUser')));
    }

    /** Admin only (route-level): assign the thread, link it to a lead/contact, toggle AI. */
    public function update(UpdateConversationRequest $request, Conversation $conversation): JsonResponse
    {
        $conversation = $this->conversations->update($conversation, $request->validated());

        return ApiResponse::success(new ConversationResource($conversation->load('assignedUser')));
    }
}
