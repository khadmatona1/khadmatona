<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per anonymous browser. `uuid` is a random identifier the
        // tracker generates and keeps in localStorage. It is never derived
        // from, or linked to, an IP address, account or form value.
        Schema::create('analytics_visitors', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->unsignedInteger('sessions_count')->default(0);
            $table->timestamps();

            $table->index('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_visitors');
    }
};
