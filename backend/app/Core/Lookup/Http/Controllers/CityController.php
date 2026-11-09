<?php

namespace App\Core\Lookup\Http\Controllers;

use App\Core\Lookup\Domain\Contracts\CityRepositoryInterface;
use App\Core\Lookup\Http\Resources\CityResource;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * Public, read-only reference data - feeds the city <select> on both the
 * public search filters and the admin property form.
 */
class CityController
{
    public function __construct(private readonly CityRepositoryInterface $cities) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success(CityResource::collection($this->cities->allWithTranslations()));
    }
}
