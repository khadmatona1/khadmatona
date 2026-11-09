<?php

namespace App\Modules\Analytics\Http\Requests;

use App\Modules\Analytics\Domain\Enums\AnalyticsEventType;
use App\Modules\Analytics\Domain\Enums\TrackedForm;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Accepts the minimum the tracker needs and nothing else. Field names,
 * steps and CTA labels are restricted to identifier characters, so a form
 * VALUE (an email with "@", a phone number with "+" or spaces, free text)
 * can never be smuggled in through them.
 */
class CollectRequest extends FormRequest
{
    public const MAX_EVENTS = 50;

    private const IDENTIFIER = 'regex:/^[A-Za-z][A-Za-z0-9_.\-]{0,63}$/';

    public function authorize(): bool
    {
        return true;
    }

    /**
     * navigator.sendBeacon posts the JSON body as text/plain (a CORS-simple
     * request in every browser), which Laravel does not parse as input on
     * its own.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->isJson()) {
            $this->replace(self::decodeBody($this->getContent()));
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function decodeBody(string $content): array
    {
        if ($content === '' || strlen($content) > 256_000) {
            return [];
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $formEvents = implode(',', [
            AnalyticsEventType::FormStarted->value,
            AnalyticsEventType::FormFieldInteraction->value,
            AnalyticsEventType::FormStep->value,
            AnalyticsEventType::FormSubmitted->value,
            AnalyticsEventType::FormAbandoned->value,
        ]);

        return [
            'visitor_id' => ['required', 'uuid'],
            'session_id' => ['required', 'uuid'],
            'sent_at' => ['required', 'integer', 'min:0'],

            'context' => ['sometimes', 'array:landing_path,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,timezone,locale'],
            'context.landing_path' => ['nullable', 'string', 'max:2048'],
            'context.referrer' => ['nullable', 'string', 'max:2048'],
            'context.utm_source' => ['nullable', 'string', 'max:150'],
            'context.utm_medium' => ['nullable', 'string', 'max:150'],
            'context.utm_campaign' => ['nullable', 'string', 'max:150'],
            'context.utm_term' => ['nullable', 'string', 'max:150'],
            'context.utm_content' => ['nullable', 'string', 'max:150'],
            'context.timezone' => ['nullable', 'string', 'max:64'],
            'context.locale' => ['nullable', 'string', Rule::in(['ar', 'fr', 'en'])],

            'events' => ['required', 'array', 'min:1', 'max:'.self::MAX_EVENTS],
            'events.*' => ['array:type,ts,path,page_view_id,form_id,form_type,property_id,field,step,label,duration_ms'],
            'events.*.type' => ['required', Rule::enum(AnalyticsEventType::class)],
            'events.*.ts' => ['required', 'integer', 'min:0'],
            'events.*.path' => ['nullable', 'string', 'max:2048', 'starts_with:/'],
            'events.*.page_view_id' => ['nullable', 'uuid', 'required_if:events.*.type,page_view,page_leave,heartbeat'],
            'events.*.form_id' => ['nullable', 'uuid', 'required_if:events.*.type,'.$formEvents],
            'events.*.form_type' => ['nullable', Rule::enum(TrackedForm::class), 'required_if:events.*.type,'.$formEvents],
            'events.*.property_id' => ['nullable', 'integer', 'min:1'],
            'events.*.field' => ['nullable', 'string', self::IDENTIFIER],
            'events.*.step' => ['nullable', 'string', self::IDENTIFIER],
            'events.*.label' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_.:\-]{1,100}$/'],
            'events.*.duration_ms' => ['nullable', 'integer', 'min:0', 'max:86400000'],
        ];
    }
}
