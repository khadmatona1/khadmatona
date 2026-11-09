"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Clock3, XCircle, Circle, UsersRound, CalendarDays, Plus, GripVertical } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { InternalChat } from "./internal-chat";
import { DailyReports } from "./daily-reports";

type TaskStatus = "todo" | "in_progress" | "done";
type Task = { id: number; creator_id: number; assignee_id: number; title: string; description: string | null; priority: string; status: TaskStatus; due_at: string | null; report: string | null; checklist: { label: string; done: boolean }[] | null; assignee: { id: number; name: string } };
type TaskPage = { current_page: number; last_page: number; total: number };
const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
const inputClass = "min-h-11 w-full rounded-md border border-border bg-bg p-2 text-base text-text";

export function TaskWorkspace() {
  const t = useTranslations("TeamWork");
  const { user } = useAuth();
  const admin = user?.roles?.includes("Admin") ?? false;
  const senior = user?.roles?.includes("SeniorCommercial") ?? false;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [options, setOptions] = useState<{ id: number; name: string }[]>([]);
  const [assignee, setAssignee] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<TaskPage | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [error, setError] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"tasks" | "chat">("tasks");
  const [chatUnread, setChatUnread] = useState(0);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);
  const moveLock = useRef(false);
  async function moveTask(id: number, status: TaskStatus) {
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === status || moveLock.current) return;
    moveLock.current = true; setMovingId(id); setError("");
    try {
      const updated = await api.patch<Task>(`/api/v1/tasks/${id}`, { status });
      setTasks((current) => current.map((item) => item.id === id ? updated : item));
      setStats((current) => ({ ...current,
        [task.status]: Math.max(0, (current[task.status] ?? 0) - 1),
        [status]: (current[status] ?? 0) + 1,
        overdue: Math.max(0, (current.overdue ?? 0) + (task.due_at && new Date(task.due_at).getTime() < refreshedAt ? (status === "done" ? -1 : task.status === "done" ? 1 : 0) : 0)),
      }));
    } catch { setError(t("saveError")); }
    finally { moveLock.current = false; setMovingId(null); }
  }
  const mobileTabs = <div className="sticky top-0 z-10 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1 xl:hidden">{(["tasks", "chat"] as const).map((panel) => <button key={panel} type="button" aria-pressed={mobilePanel === panel} onClick={() => setMobilePanel(panel)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${mobilePanel === panel ? "bg-gold-primary/15 text-gold-primary" : "text-text-muted"}`}>{t(panel === "tasks" ? "tasksTab" : "chat")}{panel === "chat" && chatUnread > 0 && <span className="ms-2 rounded-full bg-gold-primary px-1.5 py-0.5 text-xs text-white">{chatUnread > 99 ? "99+" : chatUnread}</span>}</button>)}</div>;

  useEffect(() => {
    let cancelled = false;
    api.get<{ id: number; name: string }[]>("/api/v1/tasks/options").then((data) => { if (!cancelled) setOptions(data); }).catch(() => { if (!cancelled) setError(t("loadError")); });
    return () => { cancelled = true; };
  }, [t]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const query = new URLSearchParams({ page: String(page) });
    if (admin && assignee) query.set("assignee_id", assignee);
    if (date) query.set("date", date);
    async function refresh() {
      try {
        const result = await api.getWithMeta<Task[]>(`/api/v1/tasks?${query}`);
        if (!stopped) { setTasks(result.data); setRefreshedAt(Date.now()); setStats(result.meta?.stats as Record<string, number> ?? {}); setPagination(result.meta?.pagination as TaskPage); setError(""); setLoading(false); }
      } catch { if (!stopped) { setError(t("loadError")); setLoading(false); } }
      if (!stopped) timer = setTimeout(refresh, 30000);
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [admin, assignee, date, page, version, t]);
  const overdue = (task: Task) => task.status !== "done" && !!task.due_at && new Date(task.due_at).getTime() < refreshedAt;
  const progress = (task: Task) => `${(task.checklist ?? []).filter((item) => item.done).length}/${task.checklist?.length ?? 0}`;

  if (admin && !assignee) {
    const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
    return <div className="space-y-6">
      <header><h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("adminTitle")}</h1><p className="mt-1 text-text-muted">{t("adminSubtitle")}</p></header>
      {mobileTabs}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`min-w-0 space-y-4 ${mobilePanel === "chat" ? "hidden xl:block" : ""}`}>
          <TaskSummary stats={stats} />
          <DailyReports options={options} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-0 w-full sm:w-auto sm:min-w-56 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"><UsersRound className="h-5 w-5 text-text-muted" /><select aria-label={t("assignee")} className="min-w-0 flex-1 bg-transparent text-sm text-text" value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); setSelectedTaskId(null); }}><option value="">{t("allTeam")}</option>{options.map((option) => <option className="bg-surface" key={option.id} value={option.id}>{option.name}</option>)}</select></label>
            <label className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 sm:w-auto"><CalendarDays className="h-5 w-5 text-text-muted" /><input aria-label={t("dueDate")} type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); setSelectedTaskId(null); }} className="min-w-0 flex-1 bg-transparent text-base text-text sm:text-sm" /></label>
            <Button onClick={() => setEditor("new")}><Plus className="h-4 w-4" />{t("assignTask")}</Button>
          </div>
          {error && <p role="alert" className="text-error">{error}</p>}
          {loading ? <p role="status">{t("loading")}</p> : <><MobileTaskCards tasks={tasks} onSelect={(task) => setEditor(task)} refreshedAt={refreshedAt} /><div className="hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block"><table className="w-full text-sm"><thead className="bg-surface-muted text-text-muted"><tr>{["assignee", "taskTitle", "progress", "dueDate", "status"].map((field) => <th key={field} className="whitespace-nowrap px-4 py-3 text-start font-medium">{t(field)}</th>)}</tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className={`border-t border-border transition-colors hover:bg-gold-primary/5 ${selectedTask?.id === task.id ? "bg-gold-primary/5" : ""}`}>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-primary/15 font-semibold text-gold-primary">{task.assignee.name.slice(0, 1).toUpperCase()}</span><span className="whitespace-nowrap">{task.assignee.name}</span></div></td>
            <td className="px-4 py-3"><button type="button" aria-pressed={selectedTask?.id === task.id} onClick={() => setSelectedTaskId(task.id)} className="text-start font-medium text-text hover:text-gold-primary">{task.title}</button></td>
            <td className="whitespace-nowrap px-4 py-3">{progress(task)}</td>
            <td className="whitespace-nowrap px-4 py-3">{task.due_at ? new Date(task.due_at).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
            <td className="px-4 py-3"><TaskStatusPill status={overdue(task) ? "overdue" : task.status} /></td>
          </tr>)}</tbody></table>{!tasks.length && <p className="p-8 text-center text-text-muted">{t("empty")}</p>}</div></>}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-muted">{statuses.map((status) => <span key={status} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${status === "done" ? "bg-emerald-500" : status === "in_progress" ? "bg-amber-500" : "bg-slate-400"}`} />{t(status)}</span>)}<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" />{t("missedDeadline")}</span></div>
          {pagination && pagination.last_page > 1 && <div className="flex items-center justify-between gap-2 text-sm"><span>{t("page", { page, total: pagination.last_page })}</span><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedTaskId(null); }}>{t("previous")}</Button><Button size="sm" variant="secondary" disabled={page >= pagination.last_page} onClick={() => { setPage(page + 1); setSelectedTaskId(null); }}>{t("next")}</Button></div>}
        </section>
        <div className={`min-w-0 ${mobilePanel === "tasks" ? "hidden xl:block" : ""}`}><InternalChat onUnreadCount={setChatUnread} /></div>
        {selectedTask && <div className={`xl:col-span-2 ${mobilePanel === "chat" ? "hidden xl:block" : ""}`}><InlineTaskDetail key={`${selectedTask.id}-${version}`} task={selectedTask} onEdit={() => setEditor(selectedTask)} onSaved={() => setVersion((value) => value + 1)} /></div>}
      </div>
      {editor !== null && <TaskEditor key={editor === "new" ? "new" : editor.id} task={editor === "new" ? null : editor} options={options} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setVersion((value) => value + 1); }} />}
    </div>;
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("title")}</h1><p className="mt-1 text-text-muted">{t("subtitle")}</p></div>{(admin || senior) && <Button onClick={() => setEditor("new")}><Plus className="h-4 w-4" />{t(admin ? "assignTask" : "newTask")}</Button>}</header>
    {mobileTabs}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className={`min-w-0 space-y-4 ${mobilePanel === "chat" ? "hidden xl:block" : ""}`}>
        <TaskSummary stats={stats} />
        <DailyReports options={options} />
        <div className="flex flex-wrap items-end gap-3">
          {admin && <label className="flex min-w-0 w-full sm:w-auto sm:min-w-56 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"><UsersRound className="h-5 w-5 text-text-muted" /><select aria-label={t("assignee")} className="min-w-0 flex-1 bg-transparent text-sm text-text" value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }}><option value="">{t("allTeam")}</option>{options.map((option) => <option className="bg-surface" key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
          <label className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 sm:w-auto"><CalendarDays className="h-5 w-5 text-text-muted" /><input aria-label={t("dueDate")} type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-base text-text sm:text-sm" /></label>
          <Button variant="secondary" onClick={() => setView(view === "board" ? "table" : "board")}>{t(view === "board" ? "table" : "board")}</Button>
        </div>
        {error && <p role="alert" className="text-error">{error}</p>}
        {loading ? <p role="status">{t("loading")}</p> : view === "board" ? <div className="grid gap-3 xl:grid-cols-3">{statuses.map((status) => <div key={status} data-task-status={status} onDragOver={(event) => { if (draggedId !== null) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(status); } }} onDrop={(event) => { event.preventDefault(); if (draggedId !== null) void moveTask(draggedId, status); setDraggedId(null); setDropTarget(null); }} className={`rounded-xl border p-3 transition-colors ${dropTarget === status ? "border-gold-primary bg-gold-primary/10" : "border-border bg-surface-muted/70"}`}><h2 className="mb-3 font-semibold">{t(status)} <span className="text-text-muted">({tasks.filter((task) => task.status === status).length})</span></h2><div className="space-y-3">{tasks.filter((task) => task.status === status).map((task) => <div key={task.id} draggable={movingId === null} onDragStart={(event) => { if (moveLock.current) { event.preventDefault(); return; } event.dataTransfer.setData("text/plain", String(task.id)); event.dataTransfer.effectAllowed = "move"; setDraggedId(task.id); }} onDragEnd={() => { setDraggedId(null); setDropTarget(null); }} className={`w-full rounded-xl border p-4 text-start shadow-sm transition-colors hover:border-gold-primary ${task.status === "done" ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-surface"}`}>
          <div className="flex items-start gap-2"><button type="button" onClick={() => setEditor(task)} className="min-w-0 flex-1 break-words text-start font-semibold">{task.title}</button><TaskDragHandle disabled={movingId !== null} label={t("moveTask")} onTarget={setDropTarget} onMove={(status) => { void moveTask(task.id, status); }} /></div><p className="mt-1 line-clamp-2 text-sm text-text-muted">{task.description}</p><div className="mt-3 flex items-center gap-2 text-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-primary/15 font-semibold text-gold-primary">{task.assignee.name.slice(0, 1).toUpperCase()}</span><span>{task.assignee.name}</span></div><p className={`mt-1 text-xs ${overdue(task) ? "text-error" : "text-text-muted"}`}>{task.due_at ? new Date(task.due_at).toLocaleString() : t("noDeadline")}{overdue(task) ? ` · ${t("overdue")}` : ""}</p><TaskProgress checklist={task.checklist ?? []} /><div className="mt-3 text-xs"><span className="rounded-md bg-gold-primary/10 px-2 py-1 text-gold-primary">{t(task.priority)}</span></div>
          <select aria-label={t("status")} value={task.status} disabled={movingId !== null} onChange={(event) => { void moveTask(task.id, event.target.value as TaskStatus); }} className="mt-3 min-h-11 w-full rounded-md border border-border bg-surface px-2 text-sm">{statuses.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select>
        </div>)}{!tasks.some((task) => task.status === status) && <p className="py-5 text-center text-sm text-text-muted">{t("empty")}</p>}</div></div>)}</div> : <><MobileTaskCards tasks={tasks} onSelect={(task) => setEditor(task)} refreshedAt={refreshedAt} /><div className="hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block"><table className="w-full text-start text-sm"><thead className="bg-surface-muted"><tr>{["assignee", "taskTitle", "progress", "dueDate", "status"].map((field) => <th key={field} className="p-3 text-start">{t(field)}</th>)}</tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t border-border"><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-primary/15 font-semibold text-gold-primary">{task.assignee.name.slice(0, 1).toUpperCase()}</span><span>{task.assignee.name}</span></div></td><td className="p-3"><button className="text-gold-primary hover:underline" onClick={() => setEditor(task)}>{task.title}</button></td><td className="p-3">{progress(task)}</td><td className="p-3">{task.due_at ? new Date(task.due_at).toLocaleString() : "—"}</td><td className={`p-3 ${overdue(task) ? "text-error" : ""}`}><TaskStatusPill status={overdue(task) ? "overdue" : task.status} /></td></tr>)}</tbody></table>{!tasks.length && <p className="p-5">{t("empty")}</p>}</div></>}
        {pagination && <div className="flex items-center justify-between gap-2 text-sm"><span>{t("page", { page: pagination.current_page, total: pagination.last_page })}</span><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>{t("previous")}</Button><Button size="sm" variant="secondary" disabled={page >= pagination.last_page} onClick={() => setPage(page + 1)}>{t("next")}</Button></div>}
      </section>
      <div className={`min-w-0 ${mobilePanel === "tasks" ? "hidden xl:block" : ""}`}><InternalChat selectedPeer={admin && assignee ? assignee : undefined} onUnreadCount={setChatUnread} /></div>
    </div>
    {editor !== null && <TaskEditor key={editor === "new" ? "new" : editor.id} task={editor === "new" ? null : editor} options={options} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setVersion((value) => value + 1); }} />}
  </div>;
}

function TaskDragHandle({ disabled, label, onTarget, onMove }: { disabled: boolean; label: string; onTarget: (status: TaskStatus | null) => void; onMove: (status: TaskStatus) => void }) {
  const active = useRef(false);
  function target(x: number, y: number): TaskStatus | null {
    const value = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-task-status]")?.dataset.taskStatus;
    return statuses.includes(value as TaskStatus) ? value as TaskStatus : null;
  }
  return <button type="button" disabled={disabled} aria-label={label} title={label} className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-md text-text-muted hover:bg-gold-primary/10 active:cursor-grabbing" onDragStart={(event) => event.preventDefault()}
    onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); active.current = true; }}
    onPointerMove={(event) => { if (!active.current) return; onTarget(target(event.clientX, event.clientY)); if (event.clientY < 80) window.scrollBy(0, -18); else if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 18); }}
    onPointerUp={(event) => { if (!active.current) return; active.current = false; const status = target(event.clientX, event.clientY); onTarget(null); if (status) onMove(status); }}
    onPointerCancel={() => { active.current = false; onTarget(null); }}><GripVertical className="h-5 w-5" /></button>;
}

function MobileTaskCards({ tasks, onSelect, refreshedAt }: { tasks: Task[]; onSelect: (task: Task) => void; refreshedAt: number }) {
  const t = useTranslations("TeamWork");
  return <div className="space-y-3 sm:hidden">{tasks.map((task) => <button type="button" key={task.id} onClick={() => onSelect(task)} className="w-full rounded-xl border border-border bg-surface p-4 text-start">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{task.title}</h3><TaskStatusPill status={task.status !== "done" && task.due_at && new Date(task.due_at).getTime() < refreshedAt ? "overdue" : task.status} /></div>
    <p className="mt-2 break-words text-sm text-text-muted">{task.assignee.name}</p><p className="mt-1 text-xs text-text-muted">{task.due_at ? new Date(task.due_at).toLocaleString() : t("noDeadline")}</p><TaskProgress checklist={task.checklist ?? []} />
  </button>)}{!tasks.length && <p className="p-4 text-center text-text-muted">{t("empty")}</p>}</div>;
}

function TaskProgress({ checklist }: { checklist: { done: boolean }[] }) {
  const t = useTranslations("TeamWork");
  const completed = checklist.filter((item) => item.done).length;
  const total = checklist.length;
  const percent = total ? (completed / total) * 100 : 0;
  return <div className="mt-3 flex items-center gap-3">
    <div role="progressbar" aria-label={t("progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-valuetext={`${completed}/${total}`} className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-gold-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
    <span dir="ltr" className="shrink-0 text-xs tabular-nums text-text-muted">{completed}/{total}</span>
  </div>;
}

function TaskStatusPill({ status }: { status: TaskStatus | "overdue" }) {
  const t = useTranslations("TeamWork");
  const styles = { done: "bg-emerald-500/10 text-emerald-600", in_progress: "bg-amber-500/10 text-amber-600", overdue: "bg-rose-500/10 text-rose-600", todo: "bg-slate-500/10 text-text-muted" };
  const Icon = { done: CheckCircle2, in_progress: Clock3, overdue: XCircle, todo: Circle }[status];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${styles[status]}`}><Icon className="h-4 w-4" />{t(status === "overdue" ? "notCompleted" : status)}</span>;
}

function TaskSummary({ stats }: { stats: Record<string, number> }) {
  const t = useTranslations("TeamWork");
  return <div className="grid grid-cols-3 gap-2 sm:gap-3">{([['done', CheckCircle2, 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600'], ['todo', Circle, 'border-amber-500/15 bg-amber-500/10 text-amber-600'], ['overdue', XCircle, 'border-rose-500/15 bg-rose-500/10 text-rose-600']] as const).map(([status, Icon, color]) => <div key={status} className={`flex flex-col items-start gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${color}`}><Icon className="h-6 w-6 shrink-0 sm:h-10 sm:w-10" /><div><strong className="block text-2xl font-semibold text-text sm:text-3xl">{stats[status] ?? 0}</strong><span className="text-xs font-semibold sm:text-sm">{t(status === 'overdue' ? 'notCompleted' : status)}</span></div></div>)}</div>;
}

function InlineTaskDetail({ task, onEdit, onSaved }: { task: Task; onEdit: () => void; onSaved: () => void }) {
  const t = useTranslations("TeamWork");
  const [report, setReport] = useState(task.report ?? "");
  const [checklist, setChecklist] = useState(task.checklist ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = report !== (task.report ?? "") || JSON.stringify(checklist) !== JSON.stringify(task.checklist ?? []);
  async function save() {
    setBusy(true); setError("");
    try { await api.patch(`/api/v1/tasks/${task.id}`, { report, checklist }); onSaved(); }
    catch { setError(t("saveError")); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border bg-surface p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("details")} : {task.title} <span className="font-normal text-text-muted">— {task.assignee.name}</span></h2><Button size="sm" variant="secondary" disabled={busy} onClick={onEdit}>{t("editTask")}</Button></div>
    <div className="grid gap-6 md:grid-cols-2"><label className="text-sm">{t("report")}<textarea rows={4} value={report} disabled={busy} onChange={(event) => setReport(event.target.value)} maxLength={5000} className="mt-2 w-full rounded-lg border border-border bg-surface-muted p-3 text-text" /></label><fieldset disabled={busy}><legend className="mb-2 text-sm">{t("checklist")} ({checklist.filter((item) => item.done).length}/{checklist.length})</legend><div className="space-y-2">{checklist.map((item, index) => <label key={index} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={item.done} className="h-5 w-5 accent-[var(--color-gold-primary)]" onChange={(event) => setChecklist((current) => current.map((entry, i) => i === index ? { ...entry, done: event.target.checked } : entry))} /><span className={item.done ? "text-text-muted line-through" : ""}>{item.label}</span></label>)}{!checklist.length && <p className="text-sm text-text-muted">{t("noChecklist")}</p>}</div></fieldset></div>
    {error && <p role="alert" className="mt-3 text-error">{error}</p>}{dirty && <div className="mt-4"><Button size="sm" isLoading={busy} onClick={save}>{t("save")}</Button></div>}
  </section>;
}

function TaskEditor({ task, options, onClose, onSaved }: { task: Task | null; options: { id: number; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("TeamWork");
  const { user } = useAuth();
  const admin = user?.roles?.includes("Admin") ?? false;
  const senior = user?.roles?.includes("SeniorCommercial") ?? false;
  const manager = !task || admin || (senior && task.creator_id === user?.id);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState(String(task?.assignee_id ?? (admin ? "" : user?.id ?? "")));
  const [priority, setPriority] = useState(task?.priority ?? "normal");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [due, setDue] = useState(() => { if (!task?.due_at) return ""; const date = new Date(task.due_at); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); });
  const [checklist, setChecklist] = useState(task?.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const [report, setReport] = useState(task?.report ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const payload = { checklist, report, ...(task ? { status } : {}), ...(manager ? { title, description, assignee_id: Number(assignee), priority, due_at: due ? new Date(due).toISOString() : null } : {}) };
      if (task) await api.patch(`/api/v1/tasks/${task.id}`, payload); else await api.post("/api/v1/tasks", payload);
      onSaved();
    } catch (caught) { setError(caught instanceof ApiError ? Object.values(caught.errors).flat().join(" ") || t("saveError") : t("saveError")); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!task || !window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try { await api.delete(`/api/v1/tasks/${task.id}`); onSaved(); } catch { setError(t("saveError")); } finally { setBusy(false); }
  }
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" /><Dialog.Content className="fixed start-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6 text-text">
    <Dialog.Title className="text-xl font-semibold">{task ? t("details") : t("newTask")}</Dialog.Title><Dialog.Description className="mb-4 text-sm text-text-muted">{manager ? t("managerHint") : t("commercialHint")}</Dialog.Description>
    <form onSubmit={save} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm">{t("taskTitle")}<input required value={title} onChange={(event) => setTitle(event.target.value)} readOnly={!manager} maxLength={255} className={inputClass} /></label>
      <label className="block text-sm">{t("description")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} readOnly={!manager} maxLength={5000} className={inputClass} /></label>
      {admin && <label className="block text-sm">{t("assignee")}<select required value={assignee} onChange={(event) => setAssignee(event.target.value)} className={inputClass}><option value="">{t("chooseAssignee")}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
      {manager && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{t("dueDate")}<input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} /></label><label className="text-sm">{t("priority")}<select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClass}>{["low", "normal", "high"].map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label></div>}
      {task && <label className="block text-sm">{t("status")}<select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className={inputClass}>{statuses.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>}
      <h3 className="font-semibold">{t("checklist")}</h3>{checklist.map((item, index) => <div key={index} className="flex items-center gap-2"><label className="flex flex-1 items-center gap-2"><input type="checkbox" checked={item.done} onChange={(event) => setChecklist((current) => current.map((entry, i) => i === index ? { ...entry, done: event.target.checked } : entry))} /><span className={item.done ? "line-through text-text-muted" : ""}>{item.label}</span></label>{manager && <button type="button" aria-label={t("removeItem")} onClick={() => setChecklist((current) => current.filter((_, i) => i !== index))}>×</button>}</div>)}
      {manager && <div className="flex gap-2"><input aria-label={t("newItem")} placeholder={t("newItem")} maxLength={255} className={inputClass} value={newItem} onChange={(event) => setNewItem(event.target.value)} /><Button type="button" variant="secondary" disabled={!newItem.trim() || checklist.length >= 50} onClick={() => { setChecklist([...checklist, { label: newItem.trim(), done: false }]); setNewItem(""); }}>{t("add")}</Button></div>}
      <label className="block text-sm">{t("report")}<textarea className={inputClass} rows={3} value={report} onChange={(event) => setReport(event.target.value)} maxLength={5000} /></label>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}<div className="flex flex-wrap gap-2"><Button type="submit" isLoading={busy}>{t("save")}</Button><Button type="button" variant="secondary" onClick={onClose}>{t("cancel")}</Button>{task && manager && <Button type="button" variant="secondary" onClick={remove}>{t("delete")}</Button>}</div>
    </fieldset></form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
