<?php

namespace App\Modules\Blog\Domain\Models;

use App\Core\Media\Concerns\HasMediaConversions;
use App\Modules\Blog\Database\Factories\PostFactory;
use App\Modules\Blog\Domain\Enums\PostStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\HasMedia;

/**
 * Single-language, plain-column content (like Property's title/description)
 * rather than HasTranslations - reference/lookup data (City, District) is
 * what uses the translations table, not editorial content like this.
 *
 * @use HasFactory<PostFactory>
 */
class Post extends Model implements HasMedia
{
    /** @use HasFactory<PostFactory> */
    use HasFactory, HasMediaConversions, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'body',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => PostStatus::class,
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        $ensureSlugAndPublishDate = function (Post $post) {
            if (! $post->slug) {
                $post->slug = static::uniqueSlugFrom($post->title);
            }

            // A post marked Published needs a past published_at to actually
            // become visible (see PostController::show() and
            // EloquentPostRepository::paginateForAudience()) - defaulting it
            // to now() here means an admin choosing "Published" doesn't also
            // have to remember to separately set a timestamp for it to work.
            if ($post->status === PostStatus::Published && ! $post->published_at) {
                $post->published_at = now();
            }
        };

        static::creating($ensureSlugAndPublishDate);
        static::updating($ensureSlugAndPublishDate);
    }

    private static function uniqueSlugFrom(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('cover')->singleFile();
    }

    protected static function newFactory(): PostFactory
    {
        return PostFactory::new();
    }
}
