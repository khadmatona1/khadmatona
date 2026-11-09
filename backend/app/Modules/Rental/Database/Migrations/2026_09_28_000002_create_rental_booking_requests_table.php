<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_booking_requests', function (Blueprint $table) {
            $table->id();
            $table->ulid('reference')->unique();
            $table->uuid('request_key')->unique();
            $table->string('fingerprint', 64);
            $table->foreignId('rental_property_id')->constrained('rental_properties')->restrictOnDelete();
            $table->unsignedBigInteger('property_id')->index();
            $table->string('guest_name');
            $table->string('guest_phone', 30);
            $table->string('guest_email');
            $table->unsignedSmallInteger('guests_count');
            $table->date('check_in_date');
            $table->date('check_out_date');
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignId('reservation_id')->nullable()->unique()->constrained('rental_reservations')->restrictOnDelete();
            $table->timestamp('consented_at');
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_booking_requests');
    }
};
