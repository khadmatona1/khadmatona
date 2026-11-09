<?php

namespace App\Modules\Task\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Task\Domain\Models\DailyReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DailyReportController
{
    protected string $reportModel = DailyReport::class;

    protected function normalizeDate(string $date): string
    {
        return $date;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = $this->reportModel::query()->with('user:id,name');
        if (! $request->user()->hasRole('Admin')) {
            $query->where('user_id', $request->user()->id);
        } elseif (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
        if (! empty($filters['date'])) {
            $query->where('report_date', $this->normalizeDate($filters['date']));
        }
        $reports = $query->orderByDesc('report_date')->orderByDesc('id')->paginate(20);

        return ApiResponse::success($reports->items(), ['pagination' => [
            'current_page' => $reports->currentPage(), 'last_page' => $reports->lastPage(), 'total' => $reports->total(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasAnyRole(['Commercial', 'SeniorCommercial']), 403);
        $data = $request->validate([
            'report_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now(config('app.business_timezone'))->toDateString()],
            'content' => ['required', 'string', 'max:10000'],
        ]);
        $data['report_date'] = $this->normalizeDate($data['report_date']);
        // Lock the author to serialize simultaneous submissions for the same period.
        $report = DB::transaction(function () use ($request, $data) {
            $author = $request->user()->newQuery()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            return $this->reportModel::updateOrCreate(
                ['user_id' => $author->id, 'report_date' => $data['report_date']],
                ['content' => $data['content']],
            );
        });

        return ApiResponse::success($report->load('user:id,name'));
    }
}
