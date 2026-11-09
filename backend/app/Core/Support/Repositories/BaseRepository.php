<?php

namespace App\Core\Support\Repositories;

use App\Core\Support\Contracts\RepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;

/**
 * Generic Eloquent CRUD that every module's concrete repository
 * extends, so the common find/paginate/create/update/delete plumbing
 * is written once rather than per module.
 *
 * @template TModel of Model
 */
abstract class BaseRepository implements RepositoryInterface
{
    /**
     * @return class-string<TModel>
     */
    abstract protected function model(): string;

    public function find(int|string $id): ?Model
    {
        return $this->model()::find($id);
    }

    public function findOrFail(int|string $id): Model
    {
        return $this->model()::findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model()::query()->paginate($perPage);
    }

    public function create(array $attributes): Model
    {
        return $this->model()::create($attributes);
    }

    public function update(Model $model, array $attributes): Model
    {
        $model->update($attributes);

        return $model;
    }

    public function delete(Model $model): bool
    {
        return (bool) $model->delete();
    }
}
