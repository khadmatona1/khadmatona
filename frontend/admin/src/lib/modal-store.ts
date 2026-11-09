import type { ReactNode } from "react";

export type ModalTone = "success" | "error" | "info";

export type ModalState =
  | {
      kind: "alert";
      tone: ModalTone;
      message: string;
    }
  | {
      kind: "confirm";
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      onConfirm: () => void | Promise<void>;
    }
  | {
      kind: "custom";
      title?: string;
      content: ReactNode;
    };

type Listener = (state: ModalState | null) => void;

let state: ModalState | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(state));
}

export const modalStore = {
  getSnapshot: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  show(next: ModalState) {
    state = next;
    emit();
  },
  close() {
    state = null;
    emit();
  },
};
