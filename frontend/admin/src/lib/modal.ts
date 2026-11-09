import type { ReactNode } from "react";
import { modalStore, type ModalTone } from "@/lib/modal-store";

function alert(tone: ModalTone, message: string) {
  modalStore.show({ kind: "alert", tone, message });
}

export const modal = {
  success: (message: string) => alert("success", message),
  error: (message: string) => alert("error", message),
  info: (message: string) => alert("info", message),
  confirm({
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
  }: {
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void | Promise<void>;
  }) {
    modalStore.show({ kind: "confirm", message, confirmLabel, cancelLabel, onConfirm });
  },
  /** Opens arbitrary content (e.g. a record's details) as a popup instead of
   * navigating to a separate page. */
  custom({ title, content }: { title?: string; content: ReactNode }) {
    modalStore.show({ kind: "custom", title, content });
  },
  close: () => modalStore.close(),
};
