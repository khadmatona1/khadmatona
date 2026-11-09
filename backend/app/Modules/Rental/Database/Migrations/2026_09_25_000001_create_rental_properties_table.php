<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Mise en gestion": one row per catalog property KHADMATONA manages
        // for short/long-term rental. Holds the management terms; the
        // listing itself stays in the Property module.
        Schema::create('rental_properties', function (Blueprint $table) {
            $table->id();
            // Bare FK, no Eloquent relation - Property is a peer business
            // module (PROJECT_RULES.md §3). One management contract per
            // property (a soft-deleted one can be restored, not duplicated).
            $table->foreignId('property_id')->unique()->constrained('properties')->cascadeOnDelete();
            // KHADMATONA's commission in basis points (2000 = 20.00 %),
            // applied to each stay's net revenue. Snapshotted onto every
            // reservation at creation, so changing it never rewrites the past.
            $table->unsignedInteger('commission_rate_bp')->default(2000);
            // Default cost (cents) of the cleaning auto-scheduled at check-out.
            $table->unsignedBigInteger('cleaning_fee')->default(0);
            // Who pays that default cleaning: owner (default) or khadmatona.
            $table->string('cleaning_charged_to', 20)->default('owner');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_properties');
    }
};
