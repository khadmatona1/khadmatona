<?php

namespace App\Modules\Settings\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Settings\Domain\Contracts\SettingRepositoryInterface;
use App\Modules\Settings\Http\Requests\UpdateSettingRequest;
use App\Modules\Settings\Http\Resources\SettingEditResource;
use App\Modules\Settings\Http\Resources\SettingResource;
use Illuminate\Http\JsonResponse;

/**
 * Simple CRUD only (a singleton resource - show/edit/update, no store or
 * index), per PROJECT_RULES.md §6's carve-out for modules with no business
 * logic beyond CRUD.
 */
class SettingController
{
    public function __construct(private readonly SettingRepositoryInterface $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(new SettingResource($this->settings->current()));
    }

    public function edit(): JsonResponse
    {
        return ApiResponse::success(new SettingEditResource($this->settings->current()));
    }

    public function update(UpdateSettingRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $translations = $validated['translations'] ?? [];
        unset($validated['translations']);

        $setting = $this->settings->updateCurrent($validated, $translations);

        return ApiResponse::success(new SettingEditResource($setting));
    }
}
