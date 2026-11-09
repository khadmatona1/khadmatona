<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('whatsapp_conversations')->cascadeOnDelete();
            $table->string('direction', 16);
            $table->string('sender_type', 16);
            // Set only for messages an agent sent from the dashboard.
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();
            // Meta's message id ("wamid...") - the idempotency key: Meta
            // retries webhook deliveries, so one id must map to one row.
            $table->string('wa_message_id', 191)->nullable()->unique();
            // Plain string: Meta adds message types over time (text, image,
            // audio, video, document, sticker, location, contacts,
            // interactive, button, reaction, template, unsupported, ...).
            $table->string('type', 32)->default('text');
            $table->text('body')->nullable();
            // Type-specific extras: media id/mime/filename, location, template
            // name + params, ... Never holds credentials or download URLs.
            $table->json('payload')->nullable();
            $table->string('status', 16);
            $table->string('error_code', 32)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            // When the message actually happened (Meta's timestamp for
            // inbound, send time for outbound) - what the thread sorts by.
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};
