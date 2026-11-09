<?php

namespace App\Core\Notification\Http\Controllers;

use App\Core\Notification\Http\Resources\NotificationResource;
use App\Core\Notification\Notifications\NewPropertyPendingApproval;
use App\Core\Support\Http\ApiResponse;
use App\Models\User;
use App\Modules\Property\Domain\Enums\PropertyApprovalStatus;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/**
 * Powers the dashboard bell - always scoped to the authenticated user's own
 * notifications ($request->user()->notifications(), Laravel's own
 * Notifiable relation), never another user's. Simple CRUD-adjacent reads
 * only, no Service/Action layer needed (mirrors PropertyController's own
 * carve-out for this).
 */
class NotificationController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->pruneStalePendingApprovalNotifications($user);

        // The Notifiable trait's notifications() relation is already
        // ordered latest-first.
        $notifications = $user->notifications()->limit(20)->get();

        return ApiResponse::success(
            NotificationResource::collection($notifications)->resolve(),
            ['unread_count' => $user->unreadNotifications()->count()],
        );
    }

    /**
     * PropertyController::approve()/reject() already delete a "new property
     * pending" notification the moment an Admin acts on it - but that
     * notification is dispatched as a *queued* job (PROJECT_RULES.md §21:
     * mail/notifications must never block the request), so it's possible
     * for the queue worker to still be creating the row *after* the
     * approval already happened (a very fast Admin, or a busy queue). That
     * write-time delete can't catch a row that didn't exist yet, so this
     * self-heals it on every read instead: any "new property pending"
     * notification whose property is no longer actually pending (approved,
     * rejected, or deleted outright) gets removed here, regardless of how
     * it got stale.
     */
    private function pruneStalePendingApprovalNotifications(User $user): void
    {
        $user->notifications()
            ->where('type', NewPropertyPendingApproval::class)
            ->get()
            ->each(function (DatabaseNotification $notification) {
                $propertyId = $notification->data['property_id'] ?? null;
                $property = $propertyId ? Property::find($propertyId) : null;

                if (! $property || $property->approval_status !== PropertyApprovalStatus::PendingApproval) {
                    $notification->delete();
                }
            });
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $record = $request->user()->notifications()->findOrFail($notification);
        $record->markAsRead();

        return ApiResponse::success(new NotificationResource($record));
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return ApiResponse::success(['unread_count' => 0]);
    }
}
