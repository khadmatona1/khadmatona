<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users');
            $table->foreignId('assignee_id')->constrained('users');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority', 20)->default('normal');
            $table->string('status', 20)->default('todo');
            $table->dateTime('due_at')->nullable();
            $table->json('checklist')->nullable();
            $table->text('report')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['assignee_id', 'status', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_tasks');
    }
};
