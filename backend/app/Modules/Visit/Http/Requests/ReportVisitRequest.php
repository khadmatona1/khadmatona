<?php

namespace App\Modules\Visit\Http\Requests;

use App\Modules\Visit\Domain\Enums\VisitReportOutcome;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outcome' => ['required', Rule::enum(VisitReportOutcome::class)],
            'report' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
