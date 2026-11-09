<?php

namespace App\Modules\SocialPublishing\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\SocialPublishing\Application\SocialConnectionService;
use App\Modules\SocialPublishing\Http\Requests\CompleteSocialLoginRequest;
use App\Modules\SocialPublishing\Http\Requests\SelectSocialPageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialConnectionController
{
    public function __construct(private readonly SocialConnectionService $connections) {}

    public function authorizeUrl(Request $request): JsonResponse
    {
        return ApiResponse::success(['url' => $this->connections->authorizationUrl($request->user()->id)]);
    }

    public function callback(CompleteSocialLoginRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'pages' => $this->connections->completeLogin(
                $request->user()->id,
                $request->validated('code'),
                $request->validated('state'),
            ),
        ]);
    }

    public function selectPage(SelectSocialPageRequest $request): JsonResponse
    {
        $this->connections->connectPage($request->user()->id, $request->validated('page_id'));

        return ApiResponse::success();
    }

    public function verify(): JsonResponse
    {
        $this->connections->verify();

        return ApiResponse::success();
    }

    public function destroy(): JsonResponse
    {
        $this->connections->disconnect();

        return ApiResponse::success();
    }
}
