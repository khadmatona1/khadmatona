<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Only meaningful for role=Owner - links their login back to
            // the CRM Contact record (seller/landlord) that already holds
            // their name/phone/whatsapp and is what Property.owner_contact_id
            // points at. Bare FK column - User (app/Models, Core-level) may
            // reference Contact directly here since this crosses INTO a
            // business module's table by id only, same treatment
            // Property.owner_contact_id already gets.
            $table->foreignId('contact_id')->nullable()->after('is_active')
                ->constrained('contacts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('contact_id');
        });
    }
};
