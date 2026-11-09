"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { deleteExpense, getRentalStatement, listExpenses } from "@/lib/rental";
import { ExpenseForm } from "@/components/rental/rental-forms";
import { IconButton } from "@/components/rental/reservations-page";
import { MonthPicker, RentalShell, businessToday, propertyLabel, useRentalFormat } from "@/components/rental/rental-ui";
import { StatementView } from "@/components/rental/statement-view";
import { confirmThen, useRentalList } from "@/components/rental/use-rental-list";
import type { Expense, Statement } from "@/types/rental";

function lastDayOf(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

/** Revenus / dépenses and the owner / KHADMATONA split, one month at a time. */
export function FinancesPage() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const [month, setMonth] = useState(businessToday().slice(0, 7));
  const [statement, setStatement] = useState<Statement | null>(null);
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getRentalStatement(month)
      .then((result) => {
        if (!cancelled) setStatement(result);
      })
      .catch((caught) => {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [month, version]);

  const expenses = useRentalList(
    () => listExpenses({ page, perPage: 15, sort: "-incurred_on", filters: { from: `${month}-01`, to: lastDayOf(month) } }),
    JSON.stringify({ page, month, version }),
    t("genericError"),
  );

  const refresh = () => setVersion((v) => v + 1);
  const labels = { confirm: t("confirm"), cancel: t("cancel") };

  function openForm(existing?: Expense) {
    modal.custom({ content: <ExpenseForm existing={existing} onSaved={refresh} /> });
  }

  return (
    <RentalShell
      title={t("finances.title")}
      subtitle={t("finances.subtitle")}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker
            value={month}
            onChange={(next) => {
              setMonth(next);
              setPage(1);
            }}
          />
          <Button type="button" onClick={() => openForm()}>
            <Plus className="h-4 w-4" />
            {t("finances.addExpense")}
          </Button>
        </div>
      }
    >
      {statement ? <StatementView statement={statement} /> : <Skeleton className="h-64 w-full" />}

      <Card>
        <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("finances.otherExpenses")}</p>
        {expenses.items.length === 0 ? (
          <p className="text-sm text-text-muted">{t("finances.noExpenses")}</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>{t("fields.incurredOn")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.property")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.label")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("fields.amount")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.chargedTo")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {expenses.items.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell label={t("fields.incurredOn")}>{format.day(expense.incurred_on)}</TableCell>
                  <TableCell label={t("fields.property")} className="max-w-[220px] truncate">{propertyLabel(expense)}</TableCell>
                  <TableCell label={t("fields.label")}>
                    {expense.label}
                    <span className="block text-[0.72rem] text-text-muted">{t(`expenseCategory.${expense.category}`)}</span>
                  </TableCell>
                  <TableCell label={t("fields.amount")} className="text-end font-mono tabular-nums">{format.money(expense.amount)}</TableCell>
                  <TableCell label={t("fields.chargedTo")}>{t(`chargedTo.${expense.charged_to}`)}</TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <IconButton label={t("edit")} onClick={() => openForm(expense)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={t("delete")} danger onClick={() => confirmThen(t("finances.confirmDelete", { label: expense.label }), labels, () => deleteExpense(expense.id), refresh, t("genericError"))}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {expenses.pagination && (
          <div className="mt-4">
            <Pagination pagination={expenses.pagination} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </RentalShell>
  );
}
