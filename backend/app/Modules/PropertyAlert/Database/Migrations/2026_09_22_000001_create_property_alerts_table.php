<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_alerts', function (Blueprint $table) {
            $table->id();
            // No FK to users at all - anonymous visitors, no account
            // concept applies (unlike commercial_leads' forward-looking,
            // currently-unused partner_user_id).
            $table->string('email')->nullable();
            // Normalized via App\Core\Support\Phone\PhoneNumber::toE164() -
            // the only channel this feature delivers notifications through,
            // so it's required (email is informational only).
            $table->string('phone_e164', 20);
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('district_id')->nullable()->constrained()->nullOnDelete();
            // Mirrors App\Modules\Property\Domain\Enums\PropertyType's
            // values as a plain string - a business module never imports
            // another business module's enum (PROJECT_RULES.md §3).
            $table->string('property_type', 20)->nullable();
            // Cents, same convention as properties.price.
            $table->unsignedBigInteger('budget_max')->nullable();
            $table->unsignedInteger('surface_min')->nullable();
            $table->unsignedInteger('surface_max')->nullable();
            // Captured at submission - localizes the eventual WhatsApp
            // template send, independent of whatever locale an Admin
            // happens to be viewing the dashboard in later.
            $table->string('locale', 5)->default('fr');
            // sha256(phone + sorted criteria) - the entire "prevent
            // duplicate alerts for the same contact + same search
            // criteria" requirement lives in this one unique column.
            $table->char('fingerprint_hash', 64)->unique();
            $table->timestamps();

            // Matching hot path: PropertyAlertMatcher filters candidates by
            // city/type first before checking the numeric ranges.
            $table->index(['city_id', 'property_type']);
            $table->index('phone_e164');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_alerts');
    }
};
