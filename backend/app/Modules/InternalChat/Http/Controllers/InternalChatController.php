<?php

namespace App\Modules\InternalChat\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Models\User;
use App\Modules\InternalChat\Domain\Models\InternalMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InternalChatController
{
    public function contacts(Request $request): JsonResponse
    {
        $users = User::role(['Admin', 'Commercial', 'SeniorCommercial'])->where('is_active', true)
            ->where('id', '!=', $request->user()->id)->orderBy('name')->get(['id', 'name']);
        $reads = DB::table('internal_chat_reads')->where('user_id', $request->user()->id)->pluck('last_read_id', 'channel');
        $counts = InternalMessage::query()->where('sender_id', '!=', $request->user()->id)
            ->where(fn ($q) => $q->whereNull('recipient_id')->orWhere('recipient_id', $request->user()->id))
            ->selectRaw('channel, MAX(id) as latest_id')->groupBy('channel')->pluck('latest_id', 'channel');
        $users->each(function ($user) use ($request, $reads, $counts) {
            $channel = $this->channel($request->user()->id, $user->id);
            $user->setAttribute('unread', ($counts[$channel] ?? 0) > ($reads[$channel] ?? 0));
        });

        $unread = InternalMessage::query()
            ->leftJoin('internal_chat_reads as reads', function ($join) use ($request) {
                $join->on('reads.channel', '=', 'internal_messages.channel')->where('reads.user_id', $request->user()->id);
            })
            ->where('sender_id', '!=', $request->user()->id)
            ->where(fn ($q) => $q->whereNull('recipient_id')->orWhere(fn ($private) => $private->where('recipient_id', $request->user()->id)->whereIn('sender_id', $users->pluck('id'))))
            ->whereRaw('internal_messages.id > COALESCE(reads.last_read_id, 0)')
            ->selectRaw('internal_messages.channel, MAX(internal_messages.id) as latest_id, COUNT(*) as unread_count')
            ->groupBy('internal_messages.channel')->get();
        $latest = InternalMessage::with('sender:id,name')->whereIn('id', $unread->pluck('latest_id'))->get()->keyBy('id');
        $notifications = $unread->sortByDesc('latest_id')->take(20)->map(function ($row) use ($latest) {
            $message = $latest[$row->latest_id];

            return ['message_id' => $message->id, 'peer_id' => $message->recipient_id === null ? null : $message->sender_id,
                'sender_name' => $message->sender->name, 'preview' => mb_substr($message->body, 0, 120),
                'created_at' => $message->created_at, 'unread_count' => (int) $row->unread_count];
        })->values();

        return ApiResponse::success(['contacts' => $users, 'team_unread' => ($counts['team'] ?? 0) > ($reads['team'] ?? 0),
            'notifications' => $notifications, 'unread_count' => $unread->sum('unread_count')]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['peer_id' => ['nullable', 'integer'], 'before' => ['nullable', 'integer', 'min:1']]);
        $peer = $this->peer($request, $data['peer_id'] ?? null);
        $channel = $peer ? $this->channel($request->user()->id, $peer->id) : 'team';
        $query = InternalMessage::query()->where('channel', $channel)->with('sender:id,name');
        if (! empty($data['before'])) {
            $query->where('id', '<', $data['before']);
        }
        $messages = $query->orderByDesc('id')->limit(51)->get();
        $hasMore = $messages->count() > 50;

        return ApiResponse::success(['messages' => $messages->take(50)->reverse()->values(), 'has_more' => $hasMore]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['peer_id' => ['nullable', 'integer'], 'body' => ['required', 'string', 'max:4000'], 'client_id' => ['required', 'uuid']]);
        $peer = $this->peer($request, $data['peer_id'] ?? null);
        $channel = $peer ? $this->channel($request->user()->id, $peer->id) : 'team';
        $message = InternalMessage::firstOrCreate(['sender_id' => $request->user()->id, 'client_id' => $data['client_id']],
            ['channel' => $channel, 'recipient_id' => $peer?->id, 'body' => $data['body']]);
        if ($message->channel !== $channel) {
            throw ValidationException::withMessages(['client_id' => 'This message identifier was already used.']);
        }

        return ApiResponse::success($message->load('sender:id,name'), status: 201);
    }

    public function read(Request $request): JsonResponse
    {
        $data = $request->validate(['peer_id' => ['nullable', 'integer'], 'message_id' => ['required', 'integer', 'min:1']]);
        $peer = $this->peer($request, $data['peer_id'] ?? null);
        $channel = $peer ? $this->channel($request->user()->id, $peer->id) : 'team';
        abort_unless(InternalMessage::where('channel', $channel)->whereKey($data['message_id'])->exists(), 404);
        DB::transaction(function () use ($request, $channel, $data) {
            DB::table('internal_chat_reads')->insertOrIgnore(['user_id' => $request->user()->id, 'channel' => $channel, 'last_read_id' => 0]);
            DB::table('internal_chat_reads')->where('user_id', $request->user()->id)->where('channel', $channel)
                ->where('last_read_id', '<', $data['message_id'])->update(['last_read_id' => $data['message_id']]);
        });

        return ApiResponse::success();
    }

    private function peer(Request $request, ?int $id): ?User
    {
        if ($id === null) {
            return null;
        }
        $peer = User::role(['Admin', 'Commercial', 'SeniorCommercial'])->where('is_active', true)->find($id);
        if (! $peer || $peer->id === $request->user()->id) {
            throw ValidationException::withMessages(['peer_id' => 'Choose an active team member.']);
        }

        return $peer;
    }

    private function channel(int $first, int $second): string
    {
        return 'private:'.min($first, $second).':'.max($first, $second);
    }
}
