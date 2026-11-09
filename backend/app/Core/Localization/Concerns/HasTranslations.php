<?php

namespace App\Core\Localization\Concerns;

use App\Core\Localization\Models\Translation;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Backs a model's translatable fields with the shared, polymorphic
 * `translations` table instead of per-model JSON columns, so every
 * module's translatable content (property descriptions, category
 * names, ...) composes through one mechanism.
 */
trait HasTranslations
{
    public function translations(): MorphMany
    {
        return $this->morphMany(Translation::class, 'translatable');
    }

    public function translate(string $field, ?string $locale = null): ?string
    {
        $locale ??= app()->getLocale();

        $translation = $this->translations
            ->firstWhere(fn (Translation $t) => $t->field === $field && $t->locale === $locale);

        if ($translation === null && $locale !== config('app.fallback_locale')) {
            $translation = $this->translations
                ->firstWhere(fn (Translation $t) => $t->field === $field && $t->locale === config('app.fallback_locale'));
        }

        return $translation?->value;
    }

    public function setTranslation(string $field, string $locale, string $value): void
    {
        $this->translations()->updateOrCreate(
            ['field' => $field, 'locale' => $locale],
            ['value' => $value]
        );
    }
}
