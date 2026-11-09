<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('commercial_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            // Defaults to 'approved' so every existing row and every future
            // Admin-created row stays exactly as visible as today with no
            // backfill needed - only Commercial-submitted properties are
            // ever forced to 'pending_approval' (done in the controller).
            $table->string('approval_status')->default('approved')->after('status');
            $table->text('rejection_reason')->nullable()->after('approval_status');

            $table->index(['approval_status', 'commercial_id']);
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropIndex(['approval_status', 'commercial_id']);
            $table->dropConstrainedForeignId('commercial_id');
            $table->dropColumn(['approval_status', 'rejection_reason']);
        });
    }
};
