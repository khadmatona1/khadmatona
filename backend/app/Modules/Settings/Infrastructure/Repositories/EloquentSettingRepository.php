<?php

namespace App\Modules\Settings\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\Settings\Domain\Contracts\SettingRepositoryInterface;
use App\Modules\Settings\Domain\Models\Setting;
use Illuminate\Support\Facades\Cache;

class EloquentSettingRepository extends BaseRepository implements SettingRepositoryInterface
{
    protected function model(): string
    {
        return Setting::class;
    }

    public function current(): Setting
    {
        return Setting::current();
    }

    public function updateCurrent(array $attributes, array $translations): Setting
    {
        $setting = $this->current();
        $setting->update($attributes);

        foreach ($translations as $locale => $fields) {
            foreach ($fields as $field => $value) {
                // `translations`.`value` is NOT NULL, but a blank field in
                // the admin form arrives here as null - Laravel's default
                // ConvertEmptyStringsToNull middleware turns the submitted
                // "" into null before validation ever sees it, and the
                // validation rule for these fields is `nullable` (by
                // design, so clearing a field is allowed). Coerce back to
                // "" right at the write, the same "empty" representation
                // the frontend already uses everywhere else for these
                // fields - without this, saving a blank field throws
                // SQLSTATE 23000 ("Column 'value' cannot be null") and
                // aborts the whole request.
                $setting->translations()->updateOrCreate(
                    ['field' => $field, 'locale' => $locale],
                    ['value' => $value ?? ''],
                );
            }
        }

        // Setting::current() caches forever - without this, every public
        // page would keep serving the pre-update settings (contact info,
        // hero text, stats) until the cache happened to be cleared some
        // other way.
        Cache::forget(Setting::CACHE_KEY);

        return $setting->fresh('translations');
    }
}
