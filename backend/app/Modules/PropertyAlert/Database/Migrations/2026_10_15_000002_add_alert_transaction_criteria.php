<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('property_alerts', function (Blueprint $table) {
            $table->string('transaction_type', 10)->nullable();
            $table->string('price_period', 10)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('property_alerts', function (Blueprint $table) {
            $table->dropColumn(['transaction_type', 'price_period']);
        });
    }
};
