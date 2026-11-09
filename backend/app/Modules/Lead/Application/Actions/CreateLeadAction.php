<?php

namespace App\Modules\Lead\Application\Actions;

use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class CreateLeadAction
{
    public function __construct(private readonly LeadRepositoryInterface $leads) {}

    public function execute(array $data): Lead
    {
        // Registration requests may use phone only; retain the existing non-null storage contract.
        $data['email'] = $data['email'] ?? '';
        $photos = $data['photos'] ?? [];
        unset($data['photos']);

        return DB::transaction(function () use ($data, $photos): Lead {
            /** @var Lead $lead */
            $lead = $this->leads->create($data);

            try {
                foreach ($photos as $photo) {
                    // Originals only: these are inquiry attachments, not published galleries.
                    // Random names avoid exposing the uploader's original filename.
                    $lead->addMedia($photo)
                        ->usingFileName(Str::uuid().'.'.$photo->extension())
                        ->toMediaCollection('photos');
                }
            } catch (Throwable $exception) {
                // Database rollback cannot remove files already written to storage.
                $lead->clearMediaCollection('photos');
                throw $exception;
            }

            return $lead;
        });
    }
}
