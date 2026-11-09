"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { modalStore, type ModalTone } from "@/lib/modal-store";

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" strokeLinecap="round" />
    </svg>
  );
}

function InfoCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

const toneClasses: Record<ModalTone, string> = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
};

const toneIcons: Record<ModalTone, () => React.ReactNode> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InfoCircleIcon,
};

const ALERT_AUTO_CLOSE_MS = 3 * 1000;

export function ModalRoot() {
  const state = useSyncExternalStore(modalStore.subscribe, modalStore.getSnapshot, () => null);

  // Success/error alerts (not confirm dialogs or view/edit popups) close
  // themselves if left unattended - each new alert gets its own fresh timer
  // since `state` is a new object per modal.success()/error() call.
  useEffect(() => {
    if (state?.kind !== "alert") return;
    const timer = setTimeout(() => modalStore.close(), ALERT_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <Dialog.Root open={state !== null} onOpenChange={(open) => !open && modalStore.close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className={clsx(
            "fixed z-50 w-[calc(100%-2rem)] rounded-xl border border-border-strong bg-surface shadow-lg outline-none",
            state?.kind === "alert"
              ? "modal-content-bottom bottom-6 left-1/2 -translate-x-1/2"
              : "modal-content top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            state?.kind === "custom" ? "max-w-3xl p-6 sm:p-8" : "max-w-lg p-8",
          )}
          onOpenAutoFocus={(event) => {
            if (state?.kind === "alert") event.preventDefault();
          }}
        >
          {state?.kind === "confirm" && (
            <>
              <Dialog.Title className="font-display text-xl font-semibold text-text">
                {state.message}
              </Dialog.Title>
              <div className="mt-7 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md border border-border-strong px-5 py-2.5 text-[0.95rem] font-semibold text-text hover:bg-surface-muted"
                  >
                    {state.cancelLabel}
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => {
                    state.onConfirm();
                    modalStore.close();
                  }}
                  className="rounded-md bg-error px-5 py-2.5 text-[0.95rem] font-semibold text-white hover:opacity-90"
                >
                  {state.confirmLabel}
                </button>
              </div>
            </>
          )}

          {state?.kind === "alert" && (
            <div className={clsx("flex items-start gap-4", toneClasses[state.tone])}>
              {toneIcons[state.tone]()}
              <Dialog.Title className="flex-1 pt-1 text-base font-semibold text-text">
                {state.message}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted"
                >
                  <CloseIcon />
                </button>
              </Dialog.Close>
            </div>
          )}

          {state?.kind === "custom" && (
            <>
              {state.title ? (
                <Dialog.Title className="mb-4 pe-8 font-display text-xl font-semibold text-text">
                  {state.title}
                </Dialog.Title>
              ) : (
                <Dialog.Title className="sr-only">Details</Dialog.Title>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="absolute end-4 top-4 rounded-md p-1.5 text-text-muted hover:bg-surface-muted"
                >
                  <CloseIcon />
                </button>
              </Dialog.Close>
              <div className="max-h-[75vh] overflow-y-auto pe-1">{state.content}</div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
