<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\StayContractService;
use App\Modules\Rental\Http\Requests\SignStayContractRequest;
use Illuminate\Http\JsonResponse;

class StayContractController
{
    public function show(string $token, StayContractService $service): JsonResponse
    {
        return ApiResponse::success($service->details($service->find($token)));
    }

    public function sign(SignStayContractRequest $request, string $token, StayContractService $service): JsonResponse
    {
        $contract = $service->find($token);
        $contract = $service->sign($contract, $request->safe()->except('identity_document'), $request->file('identity_document'));

        return ApiResponse::success($service->details($contract));
    }
}
