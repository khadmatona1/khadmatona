<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Application\LoginAction;
use App\Core\Auth\Http\Requests\LoginRequest;
use App\Core\Auth\Http\Resources\UserResource;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

class LoginController
{
    public function __construct(private readonly LoginAction $login) {}

    public function __invoke(LoginRequest $request): JsonResponse
    {
        $user = $this->login->execute($request, $request->credentials(), $request->boolean('remember'));

        return ApiResponse::success(new UserResource($user));
    }
}
