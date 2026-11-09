<?php

namespace App\Core\Lookup\Http\Controllers;

use App\Core\Lookup\Domain\Contracts\DistrictRepositoryInterface;
use App\Core\Lookup\Http\Resources\DistrictResource;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DistrictController
{
    public function __construct(private readonly DistrictRepositoryInterface $districts) {}

    public function index(Request $request): JsonResponse
    {
        $cityId = $request->filled('city_id') ? $request->integer('city_id') : null;

        return ApiResponse::success(DistrictResource::collection(
            $this->districts->allWithTranslations($cityId)
        ));
    }
}
