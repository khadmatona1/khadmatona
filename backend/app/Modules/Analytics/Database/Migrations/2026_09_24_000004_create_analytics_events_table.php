<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Generic, append-only event stream. `event_type` is a plain string
        // validated against the AnalyticsEventType allow-list, so adding a
        // new event type is a code change only, never a schema change.
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('analytics_sessions')->cascadeOnDelete();
            $table->foreignId('visitor_id')->constrained('analytics_visitors')->cascadeOnDelete();
            $table->string('event_type', 50);
            $table->string('path', 255)->nullable();
            $table->unsignedBigInteger('property_id')->nullable();
            $table->string('form_type', 50)->nullable();
            // Field NAME only ("phone"), never its value.
            $table->string('field', 64)->nullable();
            // Short CTA identifier ("gallery", "hero_search").
            $table->string('label', 100)->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->nullable();

            $table->index(['event_type', 'occurred_at']);
            $table->index(['session_id', 'occurred_at']);
            $table->index(['property_id', 'event_type', 'occurred_at']);
            $table->index(['form_type', 'event_type', 'occurred_at']);
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
