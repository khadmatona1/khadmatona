<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Http\Resources\UserResource;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeController
{
    public function __invoke(Request $request): JsonResponse
    {
        return ApiResponse::success(new UserResource($request->user()->load('roles')));
    }
}
