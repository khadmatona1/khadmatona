<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // `phone` stays nullable at the DB level even though the Form
        // Request now requires it on the public capture endpoint -
        // pre-existing rows already have a null phone, and enforcing
        // NOT NULL here would either fail against that data or force
        // fabricating a value for it. Application-layer validation is the
        // actual enforcement point for the public API; the column itself
        // stays permissive for admin-entered or legacy records.
        Schema::table('commercial_leads', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('commercial_leads', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }
};
