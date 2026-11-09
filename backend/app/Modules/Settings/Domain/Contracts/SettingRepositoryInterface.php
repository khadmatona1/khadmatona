<?php

namespace App\Modules\Settings\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\Settings\Domain\Models\Setting;

interface SettingRepositoryInterface extends RepositoryInterface
{
    public function current(): Setting;

    /**
     * @param  array<string, mixed>  $attributes  Plain, locale-independent columns.
     * @param  array<string, array<string, string>>  $translations  [locale => [field => value]].
     */
    public function updateCurrent(array $attributes, array $translations): Setting;
}
