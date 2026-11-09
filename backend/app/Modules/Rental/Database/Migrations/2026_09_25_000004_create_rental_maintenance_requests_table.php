<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_property_id')->constrained('rental_properties')->cascadeOnDelete();
            $table->unsignedBigInteger('property_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority', 20)->default('normal');
            $table->string('status', 20)->default('open');
            $table->string('provider_name')->nullable();
            $table->date('reported_on');
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedBigInteger('cost')->default(0);
            $table->string('charged_to', 20)->default('owner');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'priority']);
            $table->index(['rental_property_id', 'reported_on']);
            $table->index('resolved_at');
            $table->index('property_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_maintenance_requests');
    }
};
