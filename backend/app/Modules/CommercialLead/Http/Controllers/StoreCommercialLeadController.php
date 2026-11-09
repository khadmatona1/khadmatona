<?php

namespace App\Modules\CommercialLead\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\CommercialLead\Domain\Contracts\CommercialLeadRepositoryInterface;
use App\Modules\CommercialLead\Http\Requests\StoreCommercialLeadRequest;
use App\Modules\CommercialLead\Http\Resources\CommercialLeadResource;
use Illuminate\Http\JsonResponse;

/**
 * Single-action controller mirroring Lead's StoreLeadController - capturing
 * a partner application is the module's only public action, so no
 * Service/Action layer per PROJECT_RULES.md §6's CRUD-only carve-out.
 */
class StoreCommercialLeadController
{
    public function __construct(private readonly CommercialLeadRepositoryInterface $commercialLeads) {}

    public function __invoke(StoreCommercialLeadRequest $request): JsonResponse
    {
        $lead = $this->commercialLeads->create($request->validated());

        return ApiResponse::success(new CommercialLeadResource($lead), status: 201);
    }
}
