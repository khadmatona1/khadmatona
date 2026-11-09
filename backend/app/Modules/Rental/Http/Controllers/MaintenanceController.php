<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\RentalOperationsService;
use App\Modules\Rental\Domain\Models\MaintenanceRequest;
use App\Modules\Rental\Http\Controllers\Concerns\RespondsWithPages;
use App\Modules\Rental\Http\Filters\MaintenanceFilter;
use App\Modules\Rental\Http\Requests\StoreMaintenanceRequest;
use App\Modules\Rental\Http\Requests\UpdateMaintenanceRequest;
use App\Modules\Rental\Http\Resources\MaintenanceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController
{
    use RespondsWithPages;

    public function __construct(private readonly RentalOperationsService $operations) {}

    public function index(Request $request, MaintenanceFilter $filter): JsonResponse
    {
        return $this->page($filter->apply()->paginate($this->perPage($request)), MaintenanceResource::class);
    }

    public function store(StoreMaintenanceRequest $request): JsonResponse
    {
        return ApiResponse::success(new MaintenanceResource($this->operations->createMaintenance($request->toModelAttributes())), status: 201);
    }

    public function update(UpdateMaintenanceRequest $request, MaintenanceRequest $maintenance): JsonResponse
    {
        return ApiResponse::success(new MaintenanceResource($this->operations->updateMaintenance($maintenance, $request->toModelAttributes())));
    }

    public function destroy(MaintenanceRequest $maintenance): JsonResponse
    {
        $this->operations->deleteMaintenance($maintenance);

        return ApiResponse::success();
    }
}
