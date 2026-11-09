<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_property_id')->constrained('rental_properties')->cascadeOnDelete();
            // Denormalized from the managed property for cheap filtering and
            // owner scoping without a join - bare column, no relation.
            $table->unsignedBigInteger('property_id');
            $table->string('guest_name');
            $table->string('guest_phone', 30)->nullable();
            $table->string('guest_email')->nullable();
            $table->unsignedSmallInteger('guests_count')->default(1);
            $table->string('channel', 20)->default('direct');
            // Calendar dates (no time): nights = check_out_date - check_in_date.
            $table->date('check_in_date');
            $table->date('check_out_date');
            // Everything in integer cents (MAD).
            $table->unsignedBigInteger('total_amount');
            // Commission the booking platform keeps (Airbnb, Booking...).
            $table->unsignedBigInteger('platform_fee')->default(0);
            // Snapshot of rental_properties.commission_rate_bp at booking.
            $table->unsignedInteger('commission_rate_bp');
            $table->string('status', 20)->default('confirmed');
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->text('check_in_notes')->nullable();
            $table->text('check_out_notes')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['rental_property_id', 'check_in_date', 'check_out_date'], 'rental_res_property_dates_idx');
            $table->index(['status', 'check_in_date']);
            $table->index('check_out_date');
            $table->index('property_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_reservations');
    }
};
