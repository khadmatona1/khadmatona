<?php

namespace App\Modules\Lead\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Lead\Application\Actions\ImportLeadsAction;
use App\Modules\Lead\Http\Requests\ImportLeadsRequest;
use Illuminate\Http\JsonResponse;

class ImportLeadsController
{
    public function __invoke(ImportLeadsRequest $request, ImportLeadsAction $import): JsonResponse
    {
        $commercialId = $request->user()->hasRole('Admin') ? null : $request->user()->id;

        return ApiResponse::success(['imported' => $import->execute($request->validated('rows'), $commercialId)], status: 201);
    }
}
