<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            // When the "À rappeler" callback is due; only meaningful while
            // status = to_call_back (cleared on any other status).
            $table->timestamp('callback_at')->nullable()->after('status');
            // Set once the due-callback reminder has been sent, so a lead is
            // never notified twice for the same scheduled time.
            $table->timestamp('callback_notified_at')->nullable()->after('callback_at');

            $table->index(['status', 'callback_at', 'callback_notified_at'], 'leads_callback_due_index');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('leads_callback_due_index');
            $table->dropColumn(['callback_at', 'callback_notified_at']);
        });
    }
};
