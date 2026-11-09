<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_cleanings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_property_id')->constrained('rental_properties')->cascadeOnDelete();
            $table->unsignedBigInteger('property_id');
            // Set when auto-scheduled by a check-out; null for a manual one.
            $table->foreignId('reservation_id')->nullable()->constrained('rental_reservations')->nullOnDelete();
            $table->date('scheduled_for');
            $table->string('status', 20)->default('pending');
            // Cleaners are usually external staff, not app users.
            $table->string('cleaner_name')->nullable();
            $table->unsignedBigInteger('cost')->default(0);
            $table->string('charged_to', 20)->default('owner');
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'scheduled_for']);
            $table->index(['rental_property_id', 'scheduled_for']);
            $table->index('property_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_cleanings');
    }
};
