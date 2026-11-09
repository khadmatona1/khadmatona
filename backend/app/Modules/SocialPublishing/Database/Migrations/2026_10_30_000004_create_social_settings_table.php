<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('facebook_enabled')->default(false);
            $table->boolean('instagram_enabled')->default(false);
            $table->boolean('default_facebook')->default(false);
            $table->boolean('default_instagram')->default(false);
            $table->string('default_mode', 20)->default('manual');
            $table->text('caption_template')->nullable();
            $table->unsignedTinyInteger('facebook_max_images')->default(10);
            $table->unsignedTinyInteger('instagram_max_images')->default(10);
            $table->timestamp('auto_enabled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_settings');
    }
};
