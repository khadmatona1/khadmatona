<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commercial_leads', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('company_name')->nullable();
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('whatsapp')->nullable();
            $table->string('city')->nullable();
            $table->string('activity_area')->nullable();
            $table->string('position')->nullable();
            $table->string('professional_type');
            $table->unsignedInteger('portfolio_size')->nullable();
            $table->json('property_types')->nullable();
            $table->string('collaboration_type')->nullable();
            $table->text('message')->nullable();
            $table->string('source')->nullable();
            $table->string('status')->default('new');
            // Forward-looking hook (not used yet): once a Partner/Commercial
            // user account system exists, a lead moved to PARTNER can be
            // linked here without a schema change. Null for every lead today.
            $table->foreignId('partner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['professional_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commercial_leads');
    }
};
