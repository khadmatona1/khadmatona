import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { OwnerMonthlyReportEntry } from "@/types/owner";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

export function OwnerMonthlyReport({ months }: { months: OwnerMonthlyReportEntry[] }) {
  const t = useTranslations("OwnerPortalReports");

  return (
    <Table>
      <TableHead>
        <TableHeaderCell>{t("month")}</TableHeaderCell>
        <TableHeaderCell>{t("leadsCount")}</TableHeaderCell>
        <TableHeaderCell>{t("completedVisitsCount")}</TableHeaderCell>
      </TableHead>
      <TableBody>
        {months.map((entry) => (
          <TableRow key={entry.month}>
            <TableCell label={t("month")} className="capitalize">
              {formatMonth(entry.month)}
            </TableCell>
            <TableCell label={t("leadsCount")}>{entry.leads_count}</TableCell>
            <TableCell label={t("completedVisitsCount")}>{entry.completed_visits_count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
