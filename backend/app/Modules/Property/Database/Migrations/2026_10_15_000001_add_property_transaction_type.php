<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Null preserves the unknown purpose of existing listings.
            $table->string('transaction_type', 10)->nullable()->index();
            $table->string('price_period', 10)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropIndex(['transaction_type']);
            $table->dropColumn(['transaction_type', 'price_period']);
        });
    }
};
