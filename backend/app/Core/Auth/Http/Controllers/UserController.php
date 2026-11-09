<?php

namespace App\Core\Auth\Http\Controllers;

use App\Core\Auth\Application\CreateUserAction;
use App\Core\Auth\Application\UpdateUserAction;
use App\Core\Auth\Domain\Contracts\UserRepositoryInterface;
use App\Core\Auth\Http\Filters\UserFilter;
use App\Core\Auth\Http\Requests\StoreUserRequest;
use App\Core\Auth\Http\Requests\UpdateUserRequest;
use App\Core\Auth\Http\Resources\UserResource;
use App\Core\Support\Http\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin management of *other* users' accounts - distinct from the /auth/*
 * endpoints, which are about the currently authenticated user's own
 * session. Simple CRUD, same carve-out PropertyController uses for
 * skipping a Service layer (business logic beyond plain persistence -
 * password hashing, role assignment - lives in the two Actions instead).
 */
class UserController
{
    public function __construct(
        private readonly CreateUserAction $createUser,
        private readonly UpdateUserAction $updateUser,
        private readonly UserRepositoryInterface $users,
    ) {}

    public function index(Request $request, UserFilter $filter): JsonResponse
    {
        $users = $filter->apply()->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            UserResource::collection($users)->resolve(),
            ['pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]]
        );
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponse::success(new UserResource($user->load('roles')));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->createUser->execute($request->validated());

        return ApiResponse::success(new UserResource($user->load('roles')), status: 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user = $this->updateUser->execute($user, $request->validated());

        return ApiResponse::success(new UserResource($user->load('roles')));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return ApiResponse::error(
                "You can't delete your own account while signed in.",
                [],
                422,
                'cannot_delete_self',
            );
        }

        $this->users->delete($user);

        return ApiResponse::success();
    }
}
