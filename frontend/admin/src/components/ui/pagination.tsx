import { useTranslations } from "next-intl";
import clsx from "clsx";
import type { Pagination as PaginationData } from "@/types/property";

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("Pagination");
  const { current_page: current, last_page: last, total } = pagination;

  if (last <= 1) return null;

  const pages = Array.from({ length: last }, (_, i) => i + 1).filter(
    (page) => page === 1 || page === last || Math.abs(page - current) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-[0.82rem] text-text-muted">{t("totalCount", { count: total })}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          className="rounded-sm border border-border-strong px-2.5 py-1.5 font-mono text-[0.78rem] text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("previous")}
        </button>
        {pages.map((page, index) => (
          <span key={page} className="flex items-center gap-1">
            {index > 0 && pages[index - 1] !== page - 1 && (
              <span className="px-1 text-text-muted">…</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(page)}
              className={clsx(
                "h-8 w-8 rounded-sm border font-mono text-[0.78rem]",
                page === current
                  ? "border-gold-primary bg-gradient-gold font-bold text-white"
                  : "border-border-strong bg-surface text-text",
              )}
            >
              {page}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= last}
          className="rounded-sm border border-border-strong px-2.5 py-1.5 font-mono text-[0.78rem] text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
