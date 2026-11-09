<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Application\RegisterUserAction;
use App\Core\Auth\Http\Requests\RegisterRequest;
use App\Core\Auth\Http\Resources\UserResource;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

class RegisterController
{
    public function __construct(private readonly RegisterUserAction $registerUser) {}

    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = $this->registerUser->execute($request, $request->validated());

        return ApiResponse::success(new UserResource($user), status: 201);
    }
}
