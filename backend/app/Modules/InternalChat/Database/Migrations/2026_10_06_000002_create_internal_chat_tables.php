<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('internal_messages', function (Blueprint $table) {
            $table->id();
            $table->string('channel', 80)->index();
            $table->foreignId('sender_id')->constrained('users');
            $table->foreignId('recipient_id')->nullable()->constrained('users');
            $table->text('body');
            $table->uuid('client_id');
            $table->timestamps();
            $table->unique(['sender_id', 'client_id']);
            $table->index(['channel', 'id']);
        });
        Schema::create('internal_chat_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('channel', 80);
            $table->unsignedBigInteger('last_read_id')->default(0);
            $table->unique(['user_id', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internal_chat_reads');
        Schema::dropIfExists('internal_messages');
    }
};
