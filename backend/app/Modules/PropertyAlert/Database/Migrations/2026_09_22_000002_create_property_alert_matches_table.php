<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_alert_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_alert_id')->constrained()->cascadeOnDelete();
            // Bare FK column only, no Eloquent relation on this side -
            // Property is a peer business module (PROJECT_RULES.md §3),
            // same treatment as properties.owner_contact_id.
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->timestamp('whatsapp_sent_at')->nullable();
            $table->timestamp('created_at')->nullable();

            // The exactly-once notify guarantee: PropertyAlertMatcher claims
            // a match via insertOrIgnore() on this pair before sending
            // anything, so a retried job (or a re-approved property) never
            // notifies the same alert about the same property twice.
            $table->unique(['property_alert_id', 'property_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_alert_matches');
    }
};
