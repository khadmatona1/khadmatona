<?php

namespace App\Modules\Lead\Http\Requests;

use App\Modules\Lead\Domain\Enums\LeadStatus;
use App\Modules\Lead\Domain\Enums\LeadType;
use App\Modules\Lead\Domain\Enums\PropertyRequestType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportLeadsRequest extends FormRequest
{
    /**
     * Excel stores a Moroccan phone as a number and therefore drops the
     * national leading zero. Restore it for the import only: public forms
     * retain their strict, explicit phone validation.
     */
    protected function prepareForValidation(): void
    {
        $rows = $this->input('rows');
        if (! is_array($rows)) {
            return;
        }

        foreach ($rows as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $rows[$index]['type'] = $row['type'] ?? 'contact';
            $rows[$index]['status'] = $row['status'] ?? LeadStatus::New->value;

            if (! empty($row['phone']) && preg_match('/^[0-9\s().-]+$/', (string) $row['phone'])) {
                $digits = (string) preg_replace('/\D/', '', (string) $row['phone']);
                if (strlen($digits) === 9 && str_starts_with($digits, '6')) {
                    $rows[$index]['phone'] = '0'.$digits;
                }
            }

            // Older exports did not include callback_at. Preserve their
            // to-call-back status and make the reminder immediately due.
            if (($row['status'] ?? null) === LeadStatus::ToCallBack->value && empty($row['callback_at'])) {
                $rows[$index]['callback_at'] = now()->toIso8601String();
            }
        }

        $this->merge(['rows' => $rows]);
    }

    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['Admin', 'Commercial', 'SeniorCommercial']) ?? false;
    }

    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*' => ['required', 'array:type,name,email,phone,status,city,district,address,message,property_id,property_type,callback_at'],
            'rows.*.property_type' => ['nullable', Rule::enum(PropertyRequestType::class)],
            'rows.*.type' => ['required', Rule::enum(LeadType::class)],
            'rows.*.name' => ['nullable', 'string', 'max:255'],
            'rows.*.email' => ['nullable', 'email', 'max:255'],
            'rows.*.phone' => ['required', 'string', 'max:255'],
            'rows.*.status' => ['required', Rule::enum(LeadStatus::class)],
            'rows.*.city' => ['nullable', 'string', 'max:255'],
            'rows.*.district' => ['nullable', 'string', 'max:255'],
            'rows.*.address' => ['required', 'string', 'max:255'],
            'rows.*.message' => ['nullable', 'string', 'max:5000'],
            'rows.*.property_id' => ['nullable', 'integer', 'exists:properties,id', 'required_if:rows.*.type,visit_request'],
            'rows.*.callback_at' => ['nullable', 'date'],
        ];
    }
}
