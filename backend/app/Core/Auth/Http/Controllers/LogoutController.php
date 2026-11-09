<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Application\LogoutAction;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoutController
{
    public function __construct(private readonly LogoutAction $logout) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->logout->execute($request);

        return ApiResponse::success();
    }
}
