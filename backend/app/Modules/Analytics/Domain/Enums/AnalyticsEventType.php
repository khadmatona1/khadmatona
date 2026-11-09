<?php

namespace App\Modules\Analytics\Domain\Enums;

/**
 * The allow-list of event types the public collect endpoint accepts.
 * Adding a new event is one new case here (plus the tracker call that sends
 * it). The analytics_events.event_type column is a plain string, so no
 * migration is ever needed.
 */
enum AnalyticsEventType: string
{
    // Navigation. page_view is stored in analytics_page_views, and
    // page_leave/heartbeat only update durations and last activity. None of
    // the three becomes an analytics_events row.
    case PageView = 'page_view';
    case PageLeave = 'page_leave';
    case Heartbeat = 'heartbeat';

    // Clicks.
    case CtaClick = 'cta_click';
    case WhatsappClick = 'whatsapp_click';
    case PhoneClick = 'phone_click';
    case EmailClick = 'email_click';
    case SocialClick = 'social_click';

    // Forms. Field NAMES only, never values.
    case FormStarted = 'form_started';
    case FormFieldInteraction = 'form_field_interaction';
    case FormStep = 'form_step';
    case FormSubmitted = 'form_submitted';
    case FormAbandoned = 'form_abandoned';

    // Business-level aliases, emitted alongside the generic events above so
    // the journey and event filters read naturally.
    case PropertyContact = 'property_contact';
    case VisitRequestStarted = 'visit_request_started';
    case VisitRequestSubmitted = 'visit_request_submitted';

    /** Whether this type becomes a row in analytics_events. */
    public function isStoredAsEvent(): bool
    {
        return ! in_array($this, [self::PageView, self::PageLeave, self::Heartbeat], true);
    }

    /** Whether this type drives the analytics_form_sessions funnel row. */
    public function isFormLifecycle(): bool
    {
        return in_array($this, [
            self::FormStarted,
            self::FormFieldInteraction,
            self::FormStep,
            self::FormSubmitted,
            self::FormAbandoned,
        ], true);
    }

    /**
     * Types an Admin can filter the event breakdown by. Includes the
     * synthetic property_view, which is derived from property page views
     * rather than sent by the tracker.
     *
     * @return array<int, string>
     */
    public static function reportable(): array
    {
        $stored = array_values(array_map(
            fn (self $type) => $type->value,
            array_filter(self::cases(), fn (self $type) => $type->isStoredAsEvent()),
        ));

        return ['page_view', 'property_view', ...$stored];
    }
}
