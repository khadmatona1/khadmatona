<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_publications', function (Blueprint $table) {
            $table->id();
            // Bare FK column, no Eloquent relation (PROJECT_RULES.md §3).
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->string('platform', 20);
            $table->string('status', 20)->index();
            $table->string('platform_post_id')->nullable();
            // Instagram's media container: lets a retry resume instead of
            // creating, and possibly publishing, a second post.
            $table->string('platform_container_id')->nullable();
            $table->text('caption')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->string('error_code', 50)->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('retry_count')->default(0);
            $table->timestamp('locked_at')->nullable();
            // Set just before the one call that makes a post public.
            $table->timestamp('commit_started_at')->nullable();
            $table->timestamps();

            // The duplicate-post guarantee.
            $table->unique(['property_id', 'platform']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_publications');
    }
};
