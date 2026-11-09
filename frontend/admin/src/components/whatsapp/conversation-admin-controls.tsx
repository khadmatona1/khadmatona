"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { listUsers } from "@/lib/users";
import { updateConversation } from "@/lib/whatsapp";
import type { User } from "@/types/api";
import type { WhatsAppConversation } from "@/types/whatsapp";

/** Admin-only: who owns the thread (and so who can see it) and the per-thread AI switch. */
export function ConversationAdminControls({
  conversation,
  aiAvailable,
  onChange,
}: {
  conversation: WhatsAppConversation;
  aiAvailable: boolean;
  onChange: (conversation: WhatsAppConversation) => void;
}) {
  const t = useTranslations("WhatsAppThread");
  const [agents, setAgents] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [commercials, seniors] = await Promise.all([
          listUsers({ role: "Commercial" }),
          listUsers({ role: "SeniorCommercial" }),
        ]);
        if (!cancelled) setAgents([...commercials.users, ...seniors.users]);
      } catch {
        // Non-blocking - the assignee picker just stays empty.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save(patch: Parameters<typeof updateConversation>[1]) {
    setIsSaving(true);
    try {
      onChange(await updateConversation(conversation.id, patch));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("actionFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-4 border-t border-border bg-surface-muted px-4 py-3">
      <div className="min-w-48 flex-1">
        <Select
          label={t("assignedTo")}
          value={conversation.assigned_user_id ?? ""}
          disabled={isSaving}
          onChange={(event) => save({ assigned_user_id: event.target.value ? Number(event.target.value) : null })}
        >
          <option value="">{t("unassigned")}</option>
          {conversation.assigned_user_id &&
            !agents.some((a) => a.id === conversation.assigned_user_id) && (
              <option value={conversation.assigned_user_id}>
                {conversation.assigned_user_name ?? `#${conversation.assigned_user_id}`}
              </option>
            )}
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </Select>
      </div>

      {aiAvailable && (
        <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold text-text">
          <input
            type="checkbox"
            checked={conversation.ai_enabled}
            disabled={isSaving}
            onChange={(event) => save({ ai_enabled: event.target.checked })}
            className="h-4 w-4 accent-[var(--color-gold-primary)]"
          />
          {t("aiAuto")}
        </label>
      )}
    </div>
  );
}
