<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_conversations', function (Blueprint $table) {
            $table->id();
            // Meta's "WhatsApp ID" for the customer: their phone number in
            // digits only, no "+" (e.g. 212612345678). One conversation per
            // customer number - the thread key everything hangs off.
            $table->string('wa_id', 32)->unique();
            $table->string('phone', 32)->nullable();
            // Profile name the customer set on WhatsApp, as sent in webhooks.
            $table->string('contact_name')->nullable();
            // Bare foreign keys to other business modules (PROJECT_RULES.md
            // §3: no cross-module Eloquent relations) - same treatment as
            // leads.property_id.
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            // The staff member responsible for this thread (drives who can see
            // it); null = unassigned, visible to Admin only.
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            // Per-conversation switch for the (optional) AI auto-reply hook.
            $table->boolean('ai_enabled')->default(false);
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamp('last_message_at')->nullable();
            // Start of the 24h customer-service window: free-form replies are
            // only allowed within 24h of the customer's last inbound message.
            $table->timestamp('last_inbound_at')->nullable();
            $table->string('last_message_preview')->nullable();
            $table->timestamps();

            $table->index('last_message_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_conversations');
    }
};
