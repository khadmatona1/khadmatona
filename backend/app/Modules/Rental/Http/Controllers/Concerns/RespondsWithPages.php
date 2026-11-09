<?php

namespace App\Modules\Rental\Http\Controllers\Concerns;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Same list envelope as LeadController/VisitController: data + meta.pagination.
 */
trait RespondsWithPages
{
    /**
     * @param  class-string<JsonResource>  $resource
     */
    protected function page(LengthAwarePaginator $page, string $resource): JsonResponse
    {
        return ApiResponse::success(
            $resource::collection($page)->resolve(),
            ['pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ]]
        );
    }

    protected function perPage(Request $request): int
    {
        return max(1, min(100, $request->integer('per_page', 15)));
    }
}
