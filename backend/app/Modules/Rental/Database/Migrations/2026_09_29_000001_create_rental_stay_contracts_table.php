<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_stay_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_request_id')->unique()->constrained('rental_booking_requests')->cascadeOnDelete();
            $table->foreignId('reservation_id')->unique()->constrained('rental_reservations')->cascadeOnDelete();
            $table->text('access_token');
            $table->string('access_token_hash', 64)->unique();
            $table->string('nationality')->nullable();
            $table->string('identity_number')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('address')->nullable();
            $table->time('estimated_arrival_time')->nullable();
            $table->string('identity_document_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->json('contract_snapshot')->nullable();
            $table->timestamp('terms_accepted_at')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_stay_contracts');
    }
};
