<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\RentalOperationsService;
use App\Modules\Rental\Domain\Models\Cleaning;
use App\Modules\Rental\Http\Controllers\Concerns\RespondsWithPages;
use App\Modules\Rental\Http\Filters\CleaningFilter;
use App\Modules\Rental\Http\Requests\StoreCleaningRequest;
use App\Modules\Rental\Http\Requests\UpdateCleaningRequest;
use App\Modules\Rental\Http\Resources\CleaningResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CleaningController
{
    use RespondsWithPages;

    public function __construct(private readonly RentalOperationsService $operations) {}

    public function index(Request $request, CleaningFilter $filter): JsonResponse
    {
        return $this->page($filter->apply()->paginate($this->perPage($request)), CleaningResource::class);
    }

    public function store(StoreCleaningRequest $request): JsonResponse
    {
        return ApiResponse::success(new CleaningResource($this->operations->createCleaning($request->toModelAttributes())), status: 201);
    }

    public function update(UpdateCleaningRequest $request, Cleaning $cleaning): JsonResponse
    {
        return ApiResponse::success(new CleaningResource($this->operations->updateCleaning($cleaning, $request->toModelAttributes())));
    }

    public function destroy(Cleaning $cleaning): JsonResponse
    {
        $this->operations->deleteCleaning($cleaning);

        return ApiResponse::success();
    }
}
