"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import type { Page } from "@/lib/rental";
import type { Pagination } from "@/types/property";

/**
 * Loads one page of a rental list whenever its key (filters/page) changes,
 * discarding stale responses. `reload()` refetches after a mutation.
 */
export function useRentalList<T>(load: () => Promise<Page<T>>, key: string, errorMessage: string) {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setPagination(page.pagination);
      })
      .catch((caught) => {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : errorMessage);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every input of `load`
  }, [key, version]);

  return { items, pagination, isLoading, reload: () => setVersion((v) => v + 1) };
}

/** Runs a row action with a confirmation, then reloads. */
export function confirmThen(
  message: string,
  labels: { confirm: string; cancel: string },
  action: () => Promise<unknown>,
  after: () => void,
  errorMessage: string,
) {
  modal.confirm({
    message,
    confirmLabel: labels.confirm,
    cancelLabel: labels.cancel,
    onConfirm: async () => {
      try {
        await action();
        after();
      } catch (caught) {
        const fieldMessage = caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] : undefined;
        modal.error(fieldMessage ?? (caught instanceof ApiError ? caught.message : errorMessage));
      }
    },
  });
}
