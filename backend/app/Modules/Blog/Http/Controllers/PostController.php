<?php

namespace App\Modules\Blog\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Blog\Domain\Contracts\PostRepositoryInterface;
use App\Modules\Blog\Domain\Enums\PostStatus;
use App\Modules\Blog\Domain\Models\Post;
use App\Modules\Blog\Http\Requests\StorePostRequest;
use App\Modules\Blog\Http\Requests\UpdatePostRequest;
use App\Modules\Blog\Http\Resources\PostResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * Simple CRUD only, per PROJECT_RULES.md §6's carve-out for modules with no
 * business logic beyond persistence. index()/show() are registered under
 * the public throttled route group (see Http/routes.php) but still check
 * for an authenticated Admin so the dashboard's own post list can reuse the
 * same endpoint and see drafts too - Sanctum's stateful session cookie
 * resolves $request->user() regardless of route grouping, no auth:sanctum
 * route middleware required just to *check* who's asking.
 */
class PostController
{
    public function __construct(private readonly PostRepositoryInterface $posts) {}

    public function index(Request $request): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->hasRole('Admin');

        $posts = $this->posts->paginateForAudience($isAdmin, $request->integer('per_page', 12));

        return ApiResponse::success(
            PostResource::collection($posts)->resolve(),
            ['pagination' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ]]
        );
    }

    public function show(Request $request, Post $post): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->hasRole('Admin');
        $isVisible = $post->status === PostStatus::Published && $post->published_at?->isPast();

        abort_unless($isAdmin || $isVisible, 404);

        return ApiResponse::success(new PostResource($post));
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        [$attributes, $coverImage] = $this->splitCoverImage($request->validated());

        $post = $this->posts->create($attributes);
        $this->attachCoverImage($post, $coverImage);

        return ApiResponse::success(new PostResource($post->fresh()), status: 201);
    }

    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        [$attributes, $coverImage] = $this->splitCoverImage($request->validated());

        $post = $this->posts->update($post, $attributes);
        $this->attachCoverImage($post, $coverImage);

        return ApiResponse::success(new PostResource($post->fresh()));
    }

    public function destroy(Post $post): JsonResponse
    {
        $this->posts->delete($post);

        return ApiResponse::success();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: array<string, mixed>, 1: UploadedFile|null}
     */
    private function splitCoverImage(array $validated): array
    {
        $coverImage = $validated['cover_image'] ?? null;
        unset($validated['cover_image']);

        return [$validated, $coverImage];
    }

    private function attachCoverImage(Post $post, ?UploadedFile $coverImage): void
    {
        if ($coverImage === null) {
            return;
        }

        // The 'cover' collection is singleFile() (Post::registerMediaCollections()),
        // so adding a new one automatically replaces the previous file.
        $post->addMedia($coverImage)->toMediaCollection('cover');
    }
}
