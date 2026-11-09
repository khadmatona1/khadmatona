<?php

namespace App\Modules\Rental\Http\Requests\Concerns;

use App\Modules\Rental\Domain\Support\Money;

/**
 * The API speaks MAD / percent; storage is cents / basis points.
 * `toModelAttributes()` is where a validated rental request crosses that
 * boundary - only for the keys actually sent, so partial updates stay partial.
 */
trait ConvertsMoney
{
    /** @return array<int, string> MAD fields -> cents. */
    protected function moneyFields(): array
    {
        return [];
    }

    /** @return array<string, string> percent field => basis-points column. */
    protected function rateFields(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    public function toModelAttributes(): array
    {
        $data = $this->validated();

        foreach ($this->moneyFields() as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = Money::toCents($data[$field]);
            }
        }

        foreach ($this->rateFields() as $field => $column) {
            if (array_key_exists($field, $data)) {
                $data[$column] = Money::percentToBasisPoints($data[$field]);
                unset($data[$field]);
            }
        }

        return $data;
    }
}
