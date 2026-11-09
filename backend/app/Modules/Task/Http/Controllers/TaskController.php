<?php

namespace App\Modules\Task\Http\Controllers;

use App\Core\Notification\Notifications\TeamTaskAssigned;
use App\Core\Support\Http\ApiResponse;
use App\Models\User;
use App\Modules\Task\Domain\Models\TeamTask;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TaskController
{
    public function options(Request $request): JsonResponse
    {
        $users = User::role(['Commercial', 'SeniorCommercial'])->where('is_active', true);
        if (! $request->user()->hasRole('Admin')) {
            $users->whereKey($request->user()->id);
        }

        return ApiResponse::success($users->orderBy('name')->get(['id', 'name']));
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'assignee_id' => ['nullable', 'integer'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = TeamTask::query()->with('assignee:id,name');
        if (! $request->user()->hasRole('Admin')) {
            $query->where('assignee_id', $request->user()->id);
        } elseif (! empty($filters['assignee_id'])) {
            $query->where('assignee_id', $filters['assignee_id']);
        }
        if (! empty($filters['date'])) {
            $from = CarbonImmutable::parse($filters['date'], config('app.business_timezone'))->startOfDay();
            $query->whereBetween('due_at', [$from->utc(), $from->endOfDay()->utc()]);
        }
        $stats = [
            'done' => (clone $query)->where('status', 'done')->count(),
            'todo' => (clone $query)->where('status', 'todo')->count(),
            'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
            'overdue' => (clone $query)->where('status', '!=', 'done')->where('due_at', '<', now())->count(),
        ];
        $tasks = $query->orderByRaw('due_at IS NULL')->orderBy('due_at')->orderByDesc('id')->paginate(100);

        return ApiResponse::success($tasks->items(), ['stats' => $stats, 'pagination' => ['current_page' => $tasks->currentPage(), 'last_page' => $tasks->lastPage(), 'total' => $tasks->total()]]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasAnyRole(['Admin', 'SeniorCommercial']), 403);
        $data = $request->validate($this->rules());
        if (! empty($data['due_at'])) {
            $data['due_at'] = CarbonImmutable::parse($data['due_at'])->utc();
        }
        if (! $request->user()->hasRole('Admin')) {
            if (isset($data['assignee_id']) && (int) $data['assignee_id'] !== $request->user()->id) {
                abort(403);
            }
            $data['assignee_id'] = $request->user()->id;
        }
        if (empty($data['assignee_id'])) {
            throw ValidationException::withMessages(['assignee_id' => 'Choose an assignee.']);
        }
        $task = DB::transaction(function () use ($data, $request) {
            $assignee = $this->activeAssignee($data['assignee_id']);
            $task = TeamTask::create([...$data, 'creator_id' => $request->user()->id, 'status' => 'todo']);
            $assignee->notify(new TeamTaskAssigned($task->id, $task->title));

            return $task;
        });

        return ApiResponse::success($task->load('assignee:id,name'), status: 201);
    }

    public function update(Request $request, TeamTask $task): JsonResponse
    {
        abort_unless($request->user()->hasRole('Admin') || $task->assignee_id === $request->user()->id, 403);
        $manager = $request->user()->hasRole('Admin') || ($request->user()->hasRole('SeniorCommercial') && $task->creator_id === $request->user()->id);
        $rules = $this->rules(true);
        if (! $manager) {
            foreach (['title', 'description', 'priority', 'due_at', 'assignee_id'] as $field) {
                $rules[$field] = ['prohibited'];
            }
        }
        $data = $request->validate($rules);
        if (! empty($data['due_at'])) {
            $data['due_at'] = CarbonImmutable::parse($data['due_at'])->utc();
        }
        if (! $request->user()->hasRole('Admin') && isset($data['assignee_id']) && (int) $data['assignee_id'] !== $request->user()->id) {
            abort(403);
        }
        $task = DB::transaction(function () use ($task, $data, $request, $manager) {
            $locked = TeamTask::query()->lockForUpdate()->findOrFail($task->id);
            abort_unless($request->user()->hasRole('Admin') || $locked->assignee_id === $request->user()->id, 403);
            if (! $manager && isset($data['checklist'])) {
                $original = $locked->checklist ?? [];
                if (array_column($original, 'label') !== array_column($data['checklist'], 'label')) {
                    throw ValidationException::withMessages(['checklist' => 'Only checklist completion may be changed.']);
                }
            }
            $changedAssignee = isset($data['assignee_id']) && (int) $data['assignee_id'] !== $locked->assignee_id;
            if (isset($data['assignee_id'])) {
                $assignee = $this->activeAssignee($data['assignee_id']);
            }
            $locked->update($data);
            if ($changedAssignee) {
                $assignee->notify(new TeamTaskAssigned($locked->id, $locked->title));
            }

            return $locked;
        });

        return ApiResponse::success($task->load('assignee:id,name'));
    }

    public function destroy(Request $request, TeamTask $task): JsonResponse
    {
        abort_unless($request->user()->hasRole('Admin') || ($request->user()->hasRole('SeniorCommercial') && $task->creator_id === $request->user()->id && $task->assignee_id === $request->user()->id), 403);
        $task->delete();

        return ApiResponse::success();
    }

    private function activeAssignee(int $id): User
    {
        $user = User::query()->lockForUpdate()->find($id);
        if (! $user?->is_active || ! $user->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            throw ValidationException::withMessages(['assignee_id' => 'Choose an active commercial.']);
        }

        return $user;
    }

    private function rules(bool $update = false): array
    {
        return [
            'title' => [$update ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'assignee_id' => ['sometimes', 'required', 'integer'],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high'])],
            'status' => ['sometimes', Rule::in(['todo', 'in_progress', 'done'])],
            'due_at' => ['nullable', 'date'],
            'report' => ['nullable', 'string', 'max:5000'],
            'checklist' => ['sometimes', 'array', 'max:50'],
            'checklist.*' => ['array:label,done'],
            'checklist.*.label' => ['required', 'string', 'max:255'],
            'checklist.*.done' => ['required', 'boolean'],
        ];
    }
}
