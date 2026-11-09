<?php

namespace App\Modules\Rental\Application\Concerns;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * Sets the display-only `property_title` attribute on single rental records
 * returned by mutate/show actions - list endpoints get it from their
 * filter's join instead. Goes through PropertyRepositoryInterface, never the
 * Property model (PROJECT_RULES.md §3).
 *
 * @property-read PropertyRepositoryInterface $properties
 */
trait ResolvesPropertyTitles
{
    /**
     * @template T of Model
     *
     * @param  T  $model
     * @return T
     */
    public function withDisplay(Model $model): Model
    {
        $propertyId = (int) $model->getAttribute('property_id');
        $model->setAttribute('property_title', $this->properties->titlesByIds([$propertyId])[$propertyId] ?? null);

        return $model;
    }
}
