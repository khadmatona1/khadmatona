<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_booking_requests', function (Blueprint $table) {
            $table->string('guest_email')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('rental_booking_requests')->whereNull('guest_email')->update(['guest_email' => '']);
        Schema::table('rental_booking_requests', function (Blueprint $table) {
            $table->string('guest_email')->nullable(false)->change();
        });
    }
};
