<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\RentalOperationsService;
use App\Modules\Rental\Domain\Models\ManagedProperty;
use App\Modules\Rental\Http\Controllers\Concerns\RespondsWithPages;
use App\Modules\Rental\Http\Filters\ManagedPropertyFilter;
use App\Modules\Rental\Http\Requests\StoreManagedPropertyRequest;
use App\Modules\Rental\Http\Requests\UpdateManagedPropertyRequest;
use App\Modules\Rental\Http\Resources\ManagedPropertyResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagedPropertyController
{
    use RespondsWithPages;

    public function __construct(private readonly RentalOperationsService $operations) {}

    public function index(Request $request, ManagedPropertyFilter $filter): JsonResponse
    {
        return $this->page($filter->apply()->paginate($this->perPage($request)), ManagedPropertyResource::class);
    }

    public function store(StoreManagedPropertyRequest $request): JsonResponse
    {
        $attributes = $request->toModelAttributes();
        $requiresApproval = ! $request->user()->hasAnyRole(['Admin', 'SeniorCommercial']);
        $attributes['approval_status'] = $requiresApproval ? 'pending' : 'approved';
        if ($requiresApproval) {
            $attributes['is_active'] = false;
        }

        return ApiResponse::success(new ManagedPropertyResource($this->operations->enroll($attributes)), status: 201);
    }

    public function approve(ManagedProperty $managedProperty): JsonResponse
    {
        return ApiResponse::success(new ManagedPropertyResource($this->operations->reviewManagement($managedProperty, true)));
    }

    public function reject(ManagedProperty $managedProperty): JsonResponse
    {
        return ApiResponse::success(new ManagedPropertyResource($this->operations->reviewManagement($managedProperty, false)));
    }

    public function show(ManagedProperty $managedProperty): JsonResponse
    {
        return ApiResponse::success(new ManagedPropertyResource($this->operations->withDisplay($managedProperty)));
    }

    public function update(UpdateManagedPropertyRequest $request, ManagedProperty $managedProperty): JsonResponse
    {
        return ApiResponse::success(new ManagedPropertyResource($this->operations->updateManaged($managedProperty, $request->toModelAttributes())));
    }

    public function destroy(ManagedProperty $managedProperty): JsonResponse
    {
        $this->operations->removeManaged($managedProperty);

        return ApiResponse::success();
    }
}
