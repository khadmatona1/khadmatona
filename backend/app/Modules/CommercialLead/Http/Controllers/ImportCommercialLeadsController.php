<?php

namespace App\Modules\CommercialLead\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\CommercialLead\Application\Actions\ImportCommercialLeadsAction;
use App\Modules\CommercialLead\Http\Requests\ImportCommercialLeadsRequest;
use Illuminate\Http\JsonResponse;

class ImportCommercialLeadsController
{
    public function __invoke(ImportCommercialLeadsRequest $request, ImportCommercialLeadsAction $import): JsonResponse
    {
        return ApiResponse::success(['imported' => $import->execute($request->validated('rows'))], status: 201);
    }
}
