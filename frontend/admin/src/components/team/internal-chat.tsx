"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type Contact = { id: number; name: string; unread: boolean };
type Message = { id: number; sender_id: number; body: string; created_at: string; sender: { name: string } };
type History = { messages: Message[]; has_more: boolean };
type ChatNotice = { message_id: number; peer_id: number | null; sender_name: string; preview: string; created_at: string; unread_count: number };

export function InternalChat({ selectedPeer, onUnreadCount }: { selectedPeer?: string; onUnreadCount?: (count: number) => void } = {}) {
  const t = useTranslations("TeamWork");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [manualPeer, setPeer] = useState("");
  const [override, setOverride] = useState<{ filter: string | undefined; peer: string } | null>(null);
  const peer = override?.filter === selectedPeer && override !== null ? override.peer : selectedPeer ?? manualPeer;
  const [notifications, setNotifications] = useState<ChatNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const menu = useRef<HTMLDetailsElement>(null);
  const onRead = useCallback(() => setRevision((value) => value + 1), []);
  function openPeer(value: string) {
    setPeer(value); setOverride({ filter: selectedPeer, peer: value });
    if (menu.current) menu.current.open = false;
  }
  const [teamUnread, setTeamUnread] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await api.get<{ contacts: Contact[]; team_unread: boolean; notifications: ChatNotice[]; unread_count: number }>("/api/v1/internal-chat/contacts");
        if (!stopped) { setContacts(data.contacts); setTeamUnread(data.team_unread); setNotifications(data.notifications); setUnreadCount(data.unread_count); onUnreadCount?.(data.unread_count); setError(""); }
      } catch { if (!stopped) setError(t("loadError")); }
      if (!stopped) timer = setTimeout(refresh, 10000);
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [t, revision, onUnreadCount]);
  return <aside className="min-w-0 rounded-xl border border-border bg-surface p-4 xl:sticky xl:top-4 xl:self-start">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{t("chat")}</h2>
      <details ref={menu} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }}>
        <summary aria-label={t("messageNotifications")} className="relative cursor-pointer list-none rounded-full p-2 text-text-muted hover:bg-surface-muted [&::-webkit-details-marker]:hidden"><Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -end-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gold-primary px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</summary>
        <div className="absolute end-0 top-full z-20 mt-2 max-h-80 w-72 max-w-[80vw] overflow-y-auto rounded-xl border border-border bg-surface shadow-lg"><h3 className="border-b border-border p-3 text-sm font-semibold">{t("messageNotifications")}</h3>{notifications.length ? notifications.map((notice) => <button key={notice.message_id} type="button" onClick={() => openPeer(notice.peer_id === null ? "" : String(notice.peer_id))} className="block w-full border-b border-border p-3 text-start last:border-0 hover:bg-gold-primary/5"><div className="flex justify-between gap-2 text-sm"><strong>{notice.sender_name}</strong><span className="text-gold-primary">{notice.unread_count}</span></div>{notice.peer_id === null && <span className="text-xs text-text-muted">{t("team")}</span>}<p className="mt-1 truncate text-xs text-text-muted">{notice.preview}</p></button>) : <p className="p-4 text-sm text-text-muted">{t("noUnreadMessages")}</p>}</div>
      </details>
    </div>
    <label className="block text-sm text-text-muted">{t("conversation")}
      <select className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface p-2 text-base text-text" value={peer} onChange={(event) => openPeer(event.target.value)}>
        <option value="">{t("team")}{teamUnread ? " •" : ""}</option>
        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.unread ? " •" : ""}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    <ChatThread key={peer} peer={peer} onRead={onRead} />
  </aside>;
}

function ChatThread({ peer, onRead }: { peer: string; onRead: () => void }) {
  const t = useTranslations("TeamWork");
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const retry = useRef<{ id: string; body: string } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const query = peer ? `?peer_id=${peer}` : "";
  const peerPayload = peer ? { peer_id: Number(peer) } : {};
  useEffect(() => {
    let stopped = false;
    let initialized = false;
    let lastReadId = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      if (document.visibilityState === "hidden") { timer = setTimeout(refresh, 4000); return; }
      try {
        const data = await api.get<History>(`/api/v1/internal-chat/messages${query}`);
        if (stopped) return;
        const element = list.current;
        const atBottom = !element || element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        setMessages((current) => Array.from(new Map([...current, ...data.messages].map((message) => [message.id, message])).values()).sort((a, b) => a.id - b.id));
        if (!initialized) { setHasMore(data.has_more); initialized = true; }
        setLoading(false); setError("");
        if (atBottom) requestAnimationFrame(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; });
        const last = data.messages.at(-1);
        if (last && last.id > lastReadId && document.hasFocus() && list.current?.getClientRects().length) {
          await api.post("/api/v1/internal-chat/read", { ...peerPayload, message_id: last.id });
          if (!stopped) { lastReadId = last.id; onRead(); }
        }
      } catch { if (!stopped) { setError(t("loadError")); setLoading(false); } }
      if (!stopped) timer = setTimeout(refresh, 4000);
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); };
    // Each conversation has its own mounted thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, t]);

  async function older() {
    if (!messages.length || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await api.get<History>(`/api/v1/internal-chat/messages${query}${query ? "&" : "?"}before=${messages[0].id}`);
      setMessages((current) => Array.from(new Map([...data.messages, ...current].map((message) => [message.id, message])).values()).sort((a, b) => a.id - b.id));
      setHasMore(data.has_more);
    } catch { setError(t("loadError")); }
    finally { setLoadingOlder(false); }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    const text = body.trim();
    const id = retry.current?.body === text ? retry.current.id : crypto.randomUUID();
    retry.current = { id, body: text };
    setBusy(true); setError("");
    try {
      const message = await api.post<Message>("/api/v1/internal-chat/messages", { ...peerPayload, body: text, client_id: id });
      setMessages((current) => Array.from(new Map([...current, message].map((item) => [item.id, item])).values()).sort((a, b) => a.id - b.id));
      setBody(""); retry.current = null;
      requestAnimationFrame(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; });
    } catch { setError(t("sendError")); }
    finally { setBusy(false); }
  }

  return <>
    <div ref={list} className="my-4 h-[min(50dvh,420px)] min-h-48 space-y-3 overflow-y-auto overscroll-contain" aria-live="polite">
      {hasMore && <Button size="sm" variant="secondary" isLoading={loadingOlder} onClick={older}>{t("older")}</Button>}
      {loading && <p className="text-sm text-text-muted">{t("loading")}</p>}
      {!loading && !messages.length && <p className="py-10 text-center text-text-muted">{t("noMessages")}</p>}
      {messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-lg p-3 ${message.sender_id === user?.id ? "ms-auto bg-gold-primary/10" : "bg-surface-muted"}`}>
        <div className="mb-1 flex justify-between gap-2 text-xs text-text-muted"><strong>{message.sender.name}</strong><time>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
      </div>)}
    </div>
    {error && <p role="alert" className="mb-2 text-sm text-error">{error}</p>}
    <form onSubmit={send} className="flex items-end gap-2">
      <textarea aria-label={t("message")} placeholder={t("message")} value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} disabled={busy} rows={2} className="min-w-0 flex-1 rounded-md border border-border bg-bg p-2 text-base" />
      <Button type="submit" className="min-h-11 shrink-0" isLoading={busy} disabled={!body.trim()}>{t("send")}</Button>
    </form>
  </>;
}
