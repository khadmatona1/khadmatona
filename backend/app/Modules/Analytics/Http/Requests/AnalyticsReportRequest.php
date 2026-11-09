<?php

namespace App\Modules\Analytics\Http\Requests;

use App\Modules\Analytics\Application\AnalyticsReportService;
use App\Modules\Analytics\Domain\Enums\AnalyticsEventType;
use App\Modules\Analytics\Domain\Enums\DeviceType;
use App\Modules\Analytics\Domain\Enums\TrackedForm;
use App\Modules\Analytics\Domain\Enums\TrafficSource;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Shared by every Admin analytics report. Every filter is allow-listed
 * (PROJECT_RULES.md: never accept arbitrary filter values).
 */
class AnalyticsReportRequest extends FormRequest
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
            'range' => ['nullable', Rule::in(AnalyticsReportService::RANGES)],
            'from' => ['required_if:range,custom', 'nullable', 'date_format:Y-m-d'],
            'to' => ['required_if:range,custom', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'source' => ['nullable', Rule::enum(TrafficSource::class)],
            'device' => ['nullable', Rule::enum(DeviceType::class)],
            'page' => ['nullable', 'string', 'max:255', 'starts_with:/'],
            'property_id' => ['nullable', 'integer', 'min:1'],
            'event' => ['nullable', Rule::in(AnalyticsEventType::reportable())],
            'form' => ['nullable', Rule::enum(TrackedForm::class)],
            'page_number' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    /**
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->input('range') !== 'custom' || $validator->errors()->isNotEmpty()) {
                    return;
                }

                $timezone = (string) config('analytics.timezone');
                $from = CarbonImmutable::createFromFormat('Y-m-d', (string) $this->input('from'), $timezone);
                $to = CarbonImmutable::createFromFormat('Y-m-d', (string) $this->input('to'), $timezone);

                if ($from->gt(CarbonImmutable::now($timezone))) {
                    $validator->errors()->add('from', 'The start date cannot be in the future.');
                }

                $maxDays = (int) config('analytics.max_range_days');
                if ($from->diffInDays($to, true) + 1 > $maxDays) {
                    $validator->errors()->add('to', "The date range cannot exceed {$maxDays} days.");
                }
            },
        ];
    }
}
