<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

/**
 * Powers the role <select> on the admin "create user" form, so role names
 * never need to be hardcoded client-side.
 */
class RoleController
{
    public function __invoke(): JsonResponse
    {
        return ApiResponse::success(Role::query()->pluck('name'));
    }
}
