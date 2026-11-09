<?php

namespace App\Modules\Lead\Application\Actions;

use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ImportLeadsAction
{
    public function __construct(
        private readonly LeadRepositoryInterface $leads,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    public function execute(array $rows, ?int $commercialId = null): int
    {
        return DB::transaction(function () use ($rows, $commercialId) {
            foreach ($rows as $row) {
                // These legacy columns are non-nullable; absent optional details stay empty.
                $row['name'] = $row['name'] ?? '';
                $row['email'] = $row['email'] ?? '';
                // Importing historical contacts does not trigger public-capture notifications.
                $row['callback_at'] = $row['status'] === 'to_call_back' ? $row['callback_at'] : null;
                if (! empty($row['property_id'])) {
                    $propertyCommercialId = $this->properties->find($row['property_id'])?->commercial_id;
                    if ($commercialId !== null && $propertyCommercialId !== $commercialId) {
                        throw ValidationException::withMessages([
                            'rows' => 'You can only import visit leads for your own properties.',
                        ]);
                    }
                    $row['commercial_id'] = $propertyCommercialId;
                } elseif ($commercialId !== null) {
                    // Imported leads stay visible only to the Commercial who
                    // added them, as the normal list filter expects.
                    $row['commercial_id'] = $commercialId;
                }
                $this->leads->create($row);
            }

            return count($rows);
        });
    }
}
