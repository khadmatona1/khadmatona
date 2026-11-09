<?php

namespace App\Modules\Blog\Database\Factories;

use App\Modules\Blog\Domain\Enums\PostStatus;
use App\Modules\Blog\Domain\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = rtrim(fake()->sentence(6), '.');
        $status = fake()->randomElement(PostStatus::cases());

        return [
            'title' => $title,
            'excerpt' => fake()->sentence(15),
            'body' => implode("\n\n", fake()->paragraphs(5)),
            'status' => $status,
            'published_at' => $status === PostStatus::Published ? fake()->dateTimeBetween('-6 months', 'now') : null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'status' => PostStatus::Draft,
            'published_at' => null,
        ]);
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => PostStatus::Published,
            'published_at' => fake()->dateTimeBetween('-6 months', 'now'),
        ]);
    }
}
