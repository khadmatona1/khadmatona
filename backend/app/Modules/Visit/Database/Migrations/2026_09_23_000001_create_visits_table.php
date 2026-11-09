<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            // Mandatory, bare FK, no Eloquent relation - Lead is a peer
            // business module (PROJECT_RULES.md §3). Created in the same
            // transaction as this row by CreateVisitAction, so a Visit
            // never outlives its Lead and the existing "Demandes de
            // visite" admin inbox stays the single source of truth for
            // the underlying inquiry.
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            // Denormalized from the booked property at creation time -
            // bare FK, no relation, cheap calendar-event rendering
            // without an extra join through Lead.
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            // Real relation is fine - User is Core-level, not a peer
            // business module (same treatment as Property::commercial()).
            // Nullable + mutable, unlike Lead's frozen-at-creation copy -
            // this becomes the actual source of truth for "who's
            // handling this visit" once assignment/reassignment happens.
            $table->foreignId('commercial_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scheduled_at');
            $table->string('status', 20)->default('scheduled');
            $table->text('report')->nullable();
            $table->string('report_outcome', 20)->nullable();
            $table->timestamp('completed_at')->nullable();
            // Mirrors property_alert_matches.whatsapp_sent_at - null until
            // the confirmation job actually succeeds; reset to null on
            // reschedule until a fresh confirmation is sent.
            $table->timestamp('whatsapp_confirmed_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('scheduled_at');
            $table->index('commercial_id');
            $table->index(['status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
