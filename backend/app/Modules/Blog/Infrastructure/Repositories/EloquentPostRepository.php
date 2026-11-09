<?php

namespace App\Modules\Blog\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Blog\Domain\Contracts\PostRepositoryInterface;
use App\Modules\Blog\Domain\Enums\PostStatus;
use App\Modules\Blog\Domain\Models\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EloquentPostRepository extends BaseRepository implements PostRepositoryInterface
{
    protected function model(): string
    {
        return Post::class;
    }

    public function paginateForAudience(bool $includeDrafts, int $perPage): LengthAwarePaginator
    {
        // PostResource::toArray() calls getFirstMediaUrl('cover', ...) on
        // every post - eager-loading media here is what keeps that from
        // firing one extra query per post in the list (mirrors
        // PropertyFilter's identical rationale for Property's media).
        $query = Post::query()->with('media')->latest('published_at');

        if (! $includeDrafts) {
            $query->where('status', PostStatus::Published)->where('published_at', '<=', now());
        }

        return $query->paginate($perPage);
    }
}
