<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_properties', function (Blueprint $table) {
            $table->string('approval_status', 20)->default('approved')->index();
        });
    }

    public function down(): void
    {
        Schema::table('rental_properties', fn (Blueprint $table) => $table->dropColumn('approval_status'));
    }
};
