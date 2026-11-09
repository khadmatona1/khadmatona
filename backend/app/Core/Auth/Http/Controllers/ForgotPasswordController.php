<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Application\SendPasswordResetLinkAction;
use App\Core\Auth\Http\Requests\ForgotPasswordRequest;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

class ForgotPasswordController
{
    public function __construct(private readonly SendPasswordResetLinkAction $sendResetLink) {}

    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $this->sendResetLink->execute($request->validated('email'));

        return ApiResponse::success(['message' => __('passwords.sent')]);
    }
}
