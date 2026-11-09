<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per form instance a visitor engaged with: the basis of the
        // started/submitted/abandoned funnels. Holds field NAMES only. No
        // value typed into a form is ever sent to, or stored by, analytics.
        // A submitted form's actual content lives exclusively in the Lead /
        // Visit / CommercialLead / PropertyAlert modules, exactly as before.
        Schema::create('analytics_form_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('session_id')->constrained('analytics_sessions')->cascadeOnDelete();
            $table->foreignId('visitor_id')->constrained('analytics_visitors')->cascadeOnDelete();
            $table->string('form_type', 50);
            $table->unsignedBigInteger('property_id')->nullable();
            $table->string('status', 20)->default('started');
            $table->timestamp('started_at');
            $table->timestamp('last_interaction_at');
            $table->json('fields_interacted')->nullable();
            $table->string('last_field', 64)->nullable();
            $table->string('last_step', 64)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('abandoned_at')->nullable();
            $table->timestamps();

            $table->index(['form_type', 'started_at']);
            $table->index(['started_at', 'status']);
            $table->index(['property_id', 'started_at']);
            $table->index(['session_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_form_sessions');
    }
};
