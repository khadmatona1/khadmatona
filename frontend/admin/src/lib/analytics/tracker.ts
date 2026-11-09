/**
 * First-party, anonymous visitor analytics for the public site.
 *
 * Talks to POST /api/v1/analytics/collect (backend App\Modules\Analytics).
 * Design rules, in order of importance:
 *
 *  1. Never break or slow the site. Every public function swallows its own
 *     errors, nothing here is awaited by page code, and events are batched
 *     and sent in the background (sendBeacon when the page is going away).
 *  2. Privacy. Visitors are random ids in localStorage, never an account,
 *     IP or fingerprint. No keystroke, form value or query string is ever
 *     read or sent: forms report field NAMES only (see use-form-analytics).
 *  3. Respect opt-outs: Do Not Track / Global Privacy Control, the
 *     NEXT_PUBLIC_ANALYTICS_ENABLED switch, and setAnalyticsOptOut().
 *
 * Events queue while `consent` is "pending" and are only sent once it
 * becomes "granted" (AnalyticsProvider grants it after confirming the
 * browser is not a logged-in staff account). "denied" drops the queue.
 */

export type AnalyticsEventType =
  | "page_view"
  | "page_leave"
  | "heartbeat"
  | "cta_click"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "social_click"
  | "form_started"
  | "form_field_interaction"
  | "form_step"
  | "form_submitted"
  | "form_abandoned"
  | "property_contact"
  | "visit_request_started"
  | "visit_request_submitted";

/** Mirrors the backend TrackedForm enum. */
export type TrackedForm =
  | "contact"
  | "sell_request"
  | "buy_request"
  | "rent_request"
  | "visit_request"
  | "property_alert"
  | "partner_application";

export interface EventData {
  form_id?: string;
  form_type?: TrackedForm;
  property_id?: number;
  field?: string;
  step?: string;
  label?: string;
}

interface QueuedEvent extends EventData {
  type: AnalyticsEventType;
  ts: number;
  path?: string;
  page_view_id?: string;
  duration_ms?: number;
}

interface SessionContext {
  landing_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  timezone: string | null;
  locale: string | null;
}

interface StoredSession {
  id: string;
  lastActivity: number;
  context: SessionContext;
}

const ENDPOINT = "/api/v1/analytics/collect";
const VISITOR_KEY = "khadmatona-analytics-vid";
const SESSION_KEY = "khadmatona-analytics-session";
const OPT_OUT_KEY = "khadmatona-analytics-optout";

/** Kept in sync with backend config('analytics.session_timeout_minutes'). */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 30_000;
/** No heartbeat once the visitor has been idle this long (tab left open). */
const IDLE_AFTER_MS = 5 * 60 * 1000;
const FLUSH_DELAY_MS = 3_000;
const FLUSH_SOON_MS = 800;
/** Server accepts 50; stay well under it. */
const MAX_BATCH = 25;
const MAX_QUEUE = 200;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const LABEL = /^[A-Za-z0-9_.:-]{1,100}$/;

type Consent = "pending" | "granted" | "denied";

const state = {
  initialized: false,
  consent: "pending" as Consent,
  queue: [] as QueuedEvent[],
  flushTimer: null as ReturnType<typeof setTimeout> | null,
  heartbeatTimer: null as ReturnType<typeof setInterval> | null,
  memoryVisitorId: null as string | null,
  memorySession: null as StoredSession | null,
  startedSessionThisLoad: false,
  pageViewId: null as string | null,
  path: null as string | null,
  /** Engaged (tab-visible) milliseconds accumulated for the current page. */
  engagedMs: 0,
  visibleSince: null as number | null,
  lastInteraction: Date.now(),
  onceLabels: new Set<string>(),
  /** Callbacks forms register so they can report abandonment on page hide. */
  hideHandlers: new Set<() => void>(),
};

// --- small, never-throwing helpers ---------------------------------------

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function storageGet(key: string): string | null {
  return safe(() => window.localStorage.getItem(key), null);
}

function storageSet(key: string, value: string): void {
  safe(() => window.localStorage.setItem(key, value), undefined);
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return safe(() => crypto.randomUUID(), fallbackUuid());
  }
  return fallbackUuid();
}

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Do Not Track, Global Privacy Control, the env switch or a stored opt-out. */
function isOptedOut(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") return true;
  if (storageGet(OPT_OUT_KEY) === "1") return true;
  return safe(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
    const win = window as Window & { doNotTrack?: string };
    const dnt = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack;
    return nav.globalPrivacyControl === true || dnt === "1" || dnt === "yes";
  }, false);
}

// --- identity --------------------------------------------------------------

function visitorId(): string {
  const stored = storageGet(VISITOR_KEY);
  if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored;

  const id = state.memoryVisitorId ?? uuid();
  state.memoryVisitorId = id;
  storageSet(VISITOR_KEY, id);
  return id;
}

function readSession(): StoredSession | null {
  const raw = storageGet(SESSION_KEY);
  if (raw) {
    const parsed = safe(() => JSON.parse(raw) as StoredSession, null);
    if (parsed?.id && typeof parsed.lastActivity === "number") return parsed;
  }
  return state.memorySession;
}

function writeSession(session: StoredSession): void {
  state.memorySession = session;
  storageSet(SESSION_KEY, JSON.stringify(session));
}

/**
 * Returns the live session, starting a new one after 30 minutes of
 * inactivity. Shared across tabs through localStorage, like most analytics
 * tools, so opening a listing in a new tab stays in the same visit.
 */
function currentSession(now: number): StoredSession {
  const existing = readSession();
  if (existing && now - existing.lastActivity < SESSION_TIMEOUT_MS) {
    existing.lastActivity = now;
    writeSession(existing);
    return existing;
  }

  const session: StoredSession = {
    id: uuid(),
    lastActivity: now,
    // Only the first session this page load starts can use
    // document.referrer and the URL's UTM tags. A session that restarts
    // after idling mid-page is attributed as direct.
    context: captureContext(state.startedSessionThisLoad ? "resume" : "entry"),
  };
  state.startedSessionThisLoad = true;
  writeSession(session);
  return session;
}

function captureContext(kind: "entry" | "resume"): SessionContext {
  const params = safe(() => new URLSearchParams(window.location.search), new URLSearchParams());
  const utm = (name: string) => (kind === "entry" ? params.get(name)?.slice(0, 150) || null : null);

  return {
    landing_path: safe(() => window.location.pathname, null),
    referrer: kind === "entry" ? externalReferrer() : null,
    utm_source: utm("utm_source"),
    utm_medium: utm("utm_medium"),
    utm_campaign: utm("utm_campaign"),
    utm_term: utm("utm_term"),
    utm_content: utm("utm_content"),
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? null, null),
    locale: safe(() => {
      const lang = document.documentElement.lang;
      return ["ar", "fr", "en"].includes(lang) ? lang : null;
    }, null),
  };
}

/** Origin only (scheme + host), and only when it's another site. */
function externalReferrer(): string | null {
  return safe(() => {
    if (!document.referrer) return null;
    const url = new URL(document.referrer);
    if (url.host === window.location.host) return null;
    return `${url.protocol}//${url.host}/`;
  }, null);
}

// --- queue & transport ----------------------------------------------------

function enqueue(event: QueuedEvent, soon = false): void {
  if (state.consent === "denied") return;

  state.queue.push(event);
  if (state.queue.length > MAX_QUEUE) state.queue.splice(0, state.queue.length - MAX_QUEUE);

  if (state.consent !== "granted") return;
  if (state.queue.length >= MAX_BATCH) {
    flush(false);
  } else {
    scheduleFlush(soon ? FLUSH_SOON_MS : FLUSH_DELAY_MS);
  }
}

function scheduleFlush(delay: number): void {
  if (state.flushTimer !== null) {
    // Pull an already-scheduled flush forward, never push it back.
    if (delay >= FLUSH_DELAY_MS) return;
    clearTimeout(state.flushTimer);
  }
  state.flushTimer = setTimeout(() => {
    state.flushTimer = null;
    flush(false);
  }, delay);
}

/**
 * Sends everything queued. `beacon` is for page hide/unload, where only
 * navigator.sendBeacon (or a keepalive fetch) reliably survives.
 */
function flush(beacon: boolean): void {
  if (state.consent !== "granted" || state.queue.length === 0 || !isBrowser()) return;

  if (state.flushTimer !== null) {
    clearTimeout(state.flushTimer);
    state.flushTimer = null;
  }

  const now = Date.now();
  const session = currentSession(now);
  const vid = visitorId();

  while (state.queue.length > 0) {
    const events = state.queue.splice(0, MAX_BATCH);
    const body = JSON.stringify({
      visitor_id: vid,
      session_id: session.id,
      sent_at: now,
      context: session.context,
      events,
    });
    send(body, beacon);
  }
}

function send(body: string, beacon: boolean): void {
  safe(() => {
    // text/plain keeps the beacon a CORS-simple request in every browser.
    // The backend parses the JSON body whatever its content type.
    if (beacon && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
    }

    void fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "omit",
      keepalive: body.length < 60_000,
    }).catch(() => {
      // Analytics is best-effort. A failed batch is dropped silently.
    });
  }, undefined);
}

// --- page timing ------------------------------------------------------------

function engagedMs(now: number): number {
  return state.engagedMs + (state.visibleSince !== null ? now - state.visibleSince : 0);
}

function finishCurrentPage(now: number): void {
  if (!state.pageViewId) return;
  enqueue({
    type: "page_leave",
    ts: now,
    page_view_id: state.pageViewId,
    path: state.path ?? undefined,
    duration_ms: Math.round(engagedMs(now)),
  });
}

function heartbeat(): void {
  const now = Date.now();
  if (!state.pageViewId || document.visibilityState !== "visible") return;
  if (now - state.lastInteraction > IDLE_AFTER_MS) return;

  enqueue({
    type: "heartbeat",
    ts: now,
    page_view_id: state.pageViewId,
    path: state.path ?? undefined,
    duration_ms: Math.round(engagedMs(now)),
  }, true);
}

// --- automatic click tracking ----------------------------------------------

const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "tiktok.com", "linkedin.com", "youtube.com", "x.com", "twitter.com"];

function classifyLink(href: string): { type: AnalyticsEventType; label?: string } | null {
  const lower = href.trim().toLowerCase();
  if (lower.startsWith("tel:")) return { type: "phone_click" };
  if (lower.startsWith("mailto:")) return { type: "email_click" };
  if (lower.startsWith("whatsapp:")) return { type: "whatsapp_click" };

  const host = safe(() => new URL(href, window.location.href).hostname.toLowerCase(), "");
  if (!host) return null;
  if (host === "wa.me" || host.endsWith("whatsapp.com")) return { type: "whatsapp_click" };

  const social = SOCIAL_HOSTS.find((domain) => host === domain || host.endsWith(`.${domain}`));
  if (social) return { type: "social_click", label: social.split(".")[0] };
  return null;
}

function handleClick(event: MouseEvent): void {
  safe(() => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const ctaElement = target.closest<HTMLElement>("[data-analytics-cta]");
    const link = target.closest<HTMLAnchorElement>("a[href]");
    const ctaLabel = ctaElement?.dataset.analyticsCta;
    const label = ctaLabel && LABEL.test(ctaLabel) ? ctaLabel : undefined;

    const linkKind = link ? classifyLink(link.getAttribute("href") ?? "") : null;
    if (linkKind) {
      trackEvent(linkKind.type, { label: linkKind.label ?? label });
      // A direct contact attempt from a property page is a business
      // signal of its own ("property_contact").
      if (["whatsapp_click", "phone_click", "email_click"].includes(linkKind.type) && isPropertyPath(state.path)) {
        trackEvent("property_contact", { label: linkKind.type });
      }
      return;
    }

    if (label) {
      if (ctaElement?.hasAttribute("data-analytics-once")) {
        if (state.onceLabels.has(label)) return;
        state.onceLabels.add(label);
      }
      trackEvent("cta_click", { label });
    }
  }, undefined);
}

function isPropertyPath(path: string | null): boolean {
  return path !== null && /^\/properties\/\d+$/.test(path);
}

function markInteraction(): void {
  state.lastInteraction = Date.now();
}

function handleVisibility(): void {
  const now = Date.now();
  if (document.visibilityState === "hidden") {
    if (state.visibleSince !== null) {
      state.engagedMs += now - state.visibleSince;
      state.visibleSince = null;
    }
    // The last reliable moment on mobile: report open forms as abandoned
    // (the server reopens them if the visitor comes back) and send
    // everything, including the page's time so far.
    state.hideHandlers.forEach((handler) => safe(handler, undefined));
    if (state.pageViewId) {
      enqueue({
        type: "page_leave",
        ts: now,
        page_view_id: state.pageViewId,
        path: state.path ?? undefined,
        duration_ms: Math.round(state.engagedMs),
      });
    }
    flush(true);
  } else {
    state.visibleSince = now;
    markInteraction();
  }
}

// --- public API -------------------------------------------------------------

/** Wires global listeners once. Safe to call repeatedly. */
export function initAnalytics(): void {
  if (!isBrowser() || state.initialized) return;
  state.initialized = true;

  if (isOptedOut()) {
    state.consent = "denied";
    state.queue = [];
    return;
  }

  safe(() => {
    document.addEventListener("click", handleClick, { capture: true, passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", () => flush(true));
    for (const name of ["pointerdown", "scroll", "wheel", "touchstart"] as const) {
      window.addEventListener(name, markInteraction, { passive: true, capture: true });
    }
    state.visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    state.heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  }, undefined);
}

/**
 * "granted" starts sending (including anything queued so far), "denied"
 * drops the queue and stops tracking for this page load.
 */
export function setAnalyticsConsent(consent: Exclude<Consent, "pending">): void {
  if (state.consent === "denied") return;
  if (consent === "denied" || isOptedOut()) {
    state.consent = "denied";
    state.queue = [];
    if (state.heartbeatTimer !== null) clearInterval(state.heartbeatTimer);
    return;
  }
  state.consent = "granted";
  flush(false);
}

/** Persistent per-browser opt-out (e.g. for a future privacy settings link). */
export function setAnalyticsOptOut(optOut: boolean): void {
  safe(() => {
    if (optOut) {
      window.localStorage.setItem(OPT_OUT_KEY, "1");
      setAnalyticsConsent("denied");
    } else {
      window.localStorage.removeItem(OPT_OUT_KEY);
    }
  }, undefined);
}

/** Records a page view and closes out the previous page's engaged time. */
export function trackPageView(path: string): void {
  safe(() => {
    if (!isBrowser() || state.consent === "denied") return;
    const now = Date.now();
    if (path === state.path && state.pageViewId) return;

    finishCurrentPage(now);

    state.pageViewId = uuid();
    state.path = path;
    state.engagedMs = 0;
    state.visibleSince = document.visibilityState === "visible" ? now : null;
    state.onceLabels.clear();
    markInteraction();

    enqueue({ type: "page_view", ts: now, path, page_view_id: state.pageViewId }, true);
  }, undefined);
}

/** Generic event on the current page. Invalid identifiers are dropped, not sent. */
export function trackEvent(type: AnalyticsEventType, data: EventData = {}, soon = false): void {
  safe(() => {
    if (!isBrowser() || state.consent === "denied") return;
    const event: QueuedEvent = { type, ts: Date.now() };
    if (state.path) event.path = state.path;
    if (data.form_id) event.form_id = data.form_id;
    if (data.form_type) event.form_type = data.form_type;
    if (data.property_id !== undefined && Number.isInteger(data.property_id) && data.property_id > 0) {
      event.property_id = data.property_id;
    }
    if (data.field && IDENTIFIER.test(data.field)) event.field = data.field;
    if (data.step && IDENTIFIER.test(data.step)) event.step = data.step;
    if (data.label && LABEL.test(data.label)) event.label = data.label;

    markInteraction();
    enqueue(event, soon);
  }, undefined);
}

/**
 * Lets a mounted form report its own abandonment when the page is hidden.
 * Returns the unregister function.
 */
export function onPageHide(handler: () => void): () => void {
  state.hideHandlers.add(handler);
  return () => {
    state.hideHandlers.delete(handler);
  };
}

export const FIELD_NAME_PATTERN = IDENTIFIER;
