<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type');
            $table->string('status')->default('disponible');
            $table->string('city');
            $table->string('address');
            // Stored as integer cents (PROJECT_RULES.md §13: "money as integer
            // cents, never floats") - formatted to MAD only at the API Resource
            // and frontend edges.
            $table->unsignedBigInteger('price');
            $table->unsignedInteger('surface');
            $table->unsignedTinyInteger('bedrooms')->default(0);
            $table->unsignedTinyInteger('bathrooms')->default(0);
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
