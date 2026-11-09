<?php

namespace App\Modules\Reviews\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Reviews\Domain\Contracts\ReviewsProviderInterface;
use Illuminate\Http\JsonResponse;

/**
 * Single read-only endpoint, no business logic beyond delegating to the
 * reviews provider - per PROJECT_RULES.md §6's carve-out for modules with
 * no business logic beyond CRUD, this skips the Application/Service layer
 * entirely.
 */
class ReviewsController
{
    public function __construct(private readonly ReviewsProviderInterface $reviews) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success($this->reviews->getSummary(app()->getLocale()));
    }
}
