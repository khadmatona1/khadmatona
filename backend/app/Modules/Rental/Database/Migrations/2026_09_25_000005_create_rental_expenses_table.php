<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Every other cost (utilities, supplies, taxes...). Cleaning and
        // maintenance costs stay on their own rows and are summed alongside
        // these in statements - never copied here, so nothing can drift.
        Schema::create('rental_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_property_id')->constrained('rental_properties')->cascadeOnDelete();
            $table->unsignedBigInteger('property_id');
            $table->string('category', 30);
            $table->string('label');
            $table->unsignedBigInteger('amount');
            $table->date('incurred_on');
            $table->string('charged_to', 20)->default('owner');
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['rental_property_id', 'incurred_on']);
            $table->index('incurred_on');
            $table->index('property_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_expenses');
    }
};
