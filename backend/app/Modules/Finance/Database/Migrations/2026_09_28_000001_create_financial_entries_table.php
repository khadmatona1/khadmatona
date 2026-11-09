<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_entries', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20);
            $table->string('label');
            $table->unsignedBigInteger('amount_cents');
            $table->date('occurred_on');
            $table->date('paid_on')->nullable()->index();
            $table->foreignId('property_id')->nullable()->constrained('properties')->restrictOnDelete();
            $table->foreignId('commercial_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['occurred_on', 'kind']);
            $table->index(['commercial_id', 'occurred_on']);
            $table->index(['property_id', 'occurred_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_entries');
    }
};
