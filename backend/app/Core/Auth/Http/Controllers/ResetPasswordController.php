<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Application\ResetPasswordAction;
use App\Core\Auth\Http\Requests\ResetPasswordRequest;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

class ResetPasswordController
{
    public function __construct(private readonly ResetPasswordAction $resetPassword) {}

    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $this->resetPassword->execute($request->validated());

        return ApiResponse::success(['message' => __('passwords.reset')]);
    }
}
