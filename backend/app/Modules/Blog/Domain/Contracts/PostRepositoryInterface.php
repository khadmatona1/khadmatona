<?php

namespace App\Modules\Blog\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PostRepositoryInterface extends RepositoryInterface
{
    /**
     * $includeDrafts is true only for an authenticated Admin viewing the
     * dashboard's own post list (see PostController::index()) - guests and
     * non-admins always get published-and-past-published_at posts only.
     */
    public function paginateForAudience(bool $includeDrafts, int $perPage): LengthAwarePaginator;
}
