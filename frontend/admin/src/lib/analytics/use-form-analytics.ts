"use client";

import { useCallback, useEffect, useMemo, useRef, type SyntheticEvent } from "react";
import { FIELD_NAME_PATTERN, onPageHide, trackEvent, uuid, type TrackedForm } from "@/lib/analytics/tracker";

/**
 * Funnel tracking for one public form: started, field interactions, step
 * changes, submitted, abandoned.
 *
 * PRIVACY: only field NAMES leave the browser. The handlers read which
 * element was focused or clicked (its `name` or `data-analytics-field`
 * attribute) and never read `.value`. Nothing typed is sent, including for
 * abandoned forms.
 *
 * Usage:
 *   const analytics = useFormAnalytics("contact");
 *   <form {...analytics.formProps} onSubmit={...}>
 *   // after the existing API call succeeds:
 *   analytics.trackSubmitted();
 *
 * The existing submit logic (Lead/Visit/... API calls) is untouched. This
 * only observes it.
 */
export function useFormAnalytics(formType: TrackedForm, options: { propertyId?: number } = {}) {
  const { propertyId } = options;
  const formId = useRef<string | null>(null);
  const fields = useRef(new Set<string>());
  const lastField = useRef<string | undefined>(undefined);
  const lastStep = useRef<string | undefined>(undefined);
  const submitted = useRef(false);
  const abandonedReported = useRef(false);

  const base = useCallback(
    () => ({ form_id: formId.current ?? undefined, form_type: formType, property_id: propertyId }),
    [formType, propertyId],
  );

  const ensureStarted = useCallback(() => {
    if (formId.current) return;
    formId.current = uuid();
    trackEvent("form_started", base());
    if (formType === "visit_request") trackEvent("visit_request_started", base());
  }, [base, formType]);

  const trackFieldInteraction = useCallback(
    (field: string) => {
      if (!FIELD_NAME_PATTERN.test(field) || submitted.current) return;
      ensureStarted();
      lastField.current = field;

      // A visitor coming back to a form already reported abandoned (tab
      // hidden, then shown again) re-opens it with any interaction.
      if (!fields.current.has(field) || abandonedReported.current) {
        fields.current.add(field);
        abandonedReported.current = false;
        trackEvent("form_field_interaction", { ...base(), field });
      }
    },
    [base, ensureStarted],
  );

  const trackStep = useCallback(
    (step: string) => {
      if (!formId.current || submitted.current || step === lastStep.current) return;
      lastStep.current = step;
      trackEvent("form_step", { ...base(), step });
    },
    [base],
  );

  const trackSubmitted = useCallback(() => {
    ensureStarted();
    if (submitted.current) return;
    submitted.current = true;
    trackEvent("form_submitted", base(), true);
    if (formType === "visit_request") {
      trackEvent("visit_request_submitted", base(), true);
      trackEvent("property_contact", { ...base(), label: "visit_request" }, true);
    }
  }, [base, ensureStarted, formType]);

  const reportAbandoned = useCallback(() => {
    if (!formId.current || submitted.current || abandonedReported.current) return;
    abandonedReported.current = true;
    trackEvent("form_abandoned", { ...base(), field: lastField.current, step: lastStep.current });
  }, [base]);

  // Leaving the page (tab hidden/closed) or navigating away inside the SPA
  // (the form unmounts) both count as abandoning a started form.
  useEffect(() => {
    const unregister = onPageHide(reportAbandoned);
    return () => {
      unregister();
      reportAbandoned();
    };
  }, [reportAbandoned]);

  const handleTarget = useCallback(
    (event: SyntheticEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const holder = target.closest<HTMLElement>("[data-analytics-field]");
      const field =
        holder?.dataset.analyticsField ??
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
          ? target.name
          : "");
      if (field) trackFieldInteraction(field);
    },
    [trackFieldInteraction],
  );

  // Focus covers keyboard/tap into inputs. Click covers custom widgets
  // (comboboxes, the date picker button), since Safari does not focus
  // buttons on click.
  const formProps = useMemo(
    () => ({ onFocusCapture: handleTarget, onClickCapture: handleTarget }),
    [handleTarget],
  );

  return { formProps, trackFieldInteraction, trackStep, trackSubmitted };
}
