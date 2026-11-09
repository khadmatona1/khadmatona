<?php

namespace App\Modules\CommercialLead\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\CommercialLead\Domain\Contracts\CommercialLeadRepositoryInterface;
use App\Modules\CommercialLead\Domain\Models\CommercialLead;
use App\Modules\CommercialLead\Http\Filters\CommercialLeadFilter;
use App\Modules\CommercialLead\Http\Requests\UpdateCommercialLeadStatusRequest;
use App\Modules\CommercialLead\Http\Resources\AdminCommercialLeadResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin-only side of the CommercialLead module - simple CRUD, no Service
 * layer, same carve-out LeadController/PropertyController use
 * (PROJECT_RULES.md §6). The public capture endpoint lives separately in
 * StoreCommercialLeadController.
 */
class CommercialLeadController
{
    public function __construct(private readonly CommercialLeadRepositoryInterface $commercialLeads) {}

    public function index(Request $request, CommercialLeadFilter $filter): JsonResponse
    {
        $leads = $filter->apply()->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            AdminCommercialLeadResource::collection($leads)->resolve(),
            ['pagination' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ]]
        );
    }

    public function show(CommercialLead $commercialLead): JsonResponse
    {
        return ApiResponse::success(new AdminCommercialLeadResource($commercialLead));
    }

    public function updateStatus(UpdateCommercialLeadStatusRequest $request, CommercialLead $commercialLead): JsonResponse
    {
        $commercialLead = $this->commercialLeads->update($commercialLead, $request->validated());

        return ApiResponse::success(new AdminCommercialLeadResource($commercialLead));
    }

    public function destroy(CommercialLead $commercialLead): JsonResponse
    {
        $this->commercialLeads->delete($commercialLead);

        return ApiResponse::success();
    }
}
