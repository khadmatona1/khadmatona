<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Core\Support\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Finance\Application\ActivityReportService;
use App\Modules\Finance\Application\FinanceService;
use App\Modules\Finance\Domain\Contracts\FinanceRepository;
use App\Modules\Finance\Domain\Models\FinancialEntry;
use App\Modules\Finance\Http\Requests\FinanceOptionsRequest;
use App\Modules\Finance\Http\Requests\FinanceReportRequest;
use App\Modules\Finance\Http\Requests\SaveFinancialEntryRequest;
use Illuminate\Http\JsonResponse;

class FinanceController extends Controller
{
    public function report(FinanceReportRequest $request, FinanceService $service): JsonResponse
    {
        return ApiResponse::success($service->report($request->validated()));
    }

    public function activity(FinanceReportRequest $request, ActivityReportService $service): JsonResponse
    {
        return ApiResponse::success($service->report($request->validated()));
    }

    public function options(FinanceOptionsRequest $request, PropertyDirectory $properties): JsonResponse
    {
        return ApiResponse::success([
            'properties' => $properties->search($request->validated('search') ?? ''),
            'commercials' => User::role(['Commercial', 'SeniorCommercial'])->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(SaveFinancialEntryRequest $request, FinanceService $service): JsonResponse
    {
        return ApiResponse::success($service->serialize($service->save($request->validated(), $request->user()->id)), status: 201);
    }

    public function update(SaveFinancialEntryRequest $request, FinancialEntry $entry, FinanceService $service): JsonResponse
    {
        return ApiResponse::success($service->serialize($service->save($request->validated(), $request->user()->id, $entry)));
    }

    public function destroy(FinancialEntry $entry, FinanceRepository $entries): JsonResponse
    {
        $entries->delete($entry);

        return ApiResponse::success();
    }
}
