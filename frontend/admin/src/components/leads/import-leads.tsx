"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import ExcelJS from "exceljs";
import { readImportWorkbook } from "@/lib/read-import-workbook";
import { importPropertyType } from "@/lib/import-property-type";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { LeadType } from "@/types/lead";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";

const fields = {
  type: "type", name: "name", email: "email", phone: "phone", status: "status",
  city: "exportCity", district: "exportDistrict", address: "exportAddress", message: "exportMessage",
};
const commercialFields = {
  full_name: "fullName", company_name: "companyName", email: "email", phone: "phone",
  whatsapp: "whatsapp", city: "city", address: "address", position: "position",
  professional_type: "professionalType", status: "status", message: "message",
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

type Preview = { headers: string[]; cells: string[][]; lines: number[]; mapping: Record<string, string>; dictionaries: Record<string, string>[] };
const messages = [fr, en, ar];

const leadTemplateFields = ["type", "name", "email", "phone", "status", "city", "district", "address", "message", "property_id", "callback_at"];
const commercialTemplateFields = ["full_name", "company_name", "email", "phone", "whatsapp", "city", "address", "position", "professional_type", "status", "message"];

export function ImportLeads({ commercial = false, type, onImported }: { commercial?: boolean; type?: LeadType; onImported: () => void }) {
  const t = useTranslations("LeadImport");
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function read(file: File) {
    setBusy(true); setError(""); setSuccess(""); setPreview(null);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 5 * 1024 * 1024) throw new Error(t("fileError"));
      const workbook = await readImportWorkbook(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount > 501 || sheet.columnCount > 50) throw new Error(t("limit"));
      const text = (value: import("exceljs").CellValue): string => {
        if (value == null) return "";
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") {
          if ("formula" in value || "sharedFormula" in value) throw new Error(t("formulaError"));
          if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
          if ("text" in value) return value.text.trim();
          throw new Error(t("fileError"));
        }
        return String(value).trim();
      };
      const headers = Array.from({ length: sheet.columnCount }, (_, index) => text(sheet.getRow(1).getCell(index + 1).value));
      const cells: string[][] = [], lines: number[] = [];
      for (let line = 2; line <= sheet.rowCount; line++) {
        const row = headers.map((_, index) => text(sheet.getRow(line).getCell(index + 1).value));
        if (row.some(Boolean)) { cells.push(row); lines.push(line); }
      }
      if (!cells.length) throw new Error(t("empty"));
      const mapping: Record<string, string> = {};
      const group = commercial ? "DashboardCommercialLeads" : "DashboardLeads";
      for (const [field, label] of Object.entries(commercial ? commercialFields : fields)) {
        const aliases = [field, ...messages.map((message) => (message[group as "DashboardLeads"] as Record<string, string>)[label])].filter(Boolean).map(normalize);
        const index = headers.findIndex((header) => aliases.includes(normalize(header)));
        mapping[field] = index < 0 ? "" : String(index);
      }
      if (!commercial) for (const field of ["property_id", "callback_at"]) {
        const index = headers.findIndex((header) => normalize(header) === field);
        mapping[field] = index < 0 ? "" : String(index);
      }
      const dictionaries = (commercial ? ["ProfessionalType", "CommercialLeadStatus"] : ["LeadType", "LeadStatus"]).map((group) => {
        const dictionary: Record<string, string> = {};
        for (const message of messages) for (const [key, label] of Object.entries(message[group as "LeadType"])) {
          dictionary[normalize(key)] = key; dictionary[normalize(label)] = key;
        }
        return dictionary;
      });
      setPreview({ headers, cells, lines, mapping, dictionaries });
      setOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("fileError")); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  async function downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Leads");
    const templateFields = commercial ? commercialTemplateFields : leadTemplateFields;
    sheet.addRow(templateFields.map((field) => t(`fields.${field}`)));
    sheet.getRow(1).font = { bold: true };
    sheet.columns = templateFields.map(() => ({ width: 22 }));
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = commercial ? "modele-leads-commerciaux.xlsx" : "modele-leads.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function save() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      const rows = preview.cells.map((cells) => {
        const row: Record<string, string | null> = {};
        for (const [field, column] of Object.entries(preview.mapping)) row[field] = column === "" ? null : cells[Number(column)] || null;
        const enumField = commercial ? "professional_type" : "type";
        if (!commercial && importPropertyType(row.type)) {
          row.property_type = importPropertyType(row.type)!;
          row.type = type ?? "contact";
        }
        row[enumField] = row[enumField] ? preview.dictionaries[0][normalize(row[enumField]!)] ?? row[enumField] : commercial ? null : type ?? null;
        row.status = row.status ? preview.dictionaries[1][normalize(row.status)] ?? row.status : "new";
        return row;
      });
      const result = await api.post<{ imported: number }>(commercial ? "/api/v1/commercial-leads/import" : "/api/v1/leads/import", { rows });
      setSuccess(t("success", { count: result.imported })); setPreview(null); onImported();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const details = Object.entries(caught.errors).map(([key, messages]) => {
          const match = /^rows\.(\d+)\.(.+)$/.exec(key);
          return `${match ? t("rowError", { row: preview.lines[Number(match[1])], field: match[2] }) : key}: ${messages.join(" ")}`;
        });
        setError(details.length ? details.join("\n") : caught.message);
      } else setError(t("error"));
    } finally { setBusy(false); }
  }

  const templateFields = commercial ? commercialTemplateFields : leadTemplateFields;
  const requiredFields = commercial ? ["full_name", "phone", "professional_type", "status"] : ["phone", "address"];

  return <div className="space-y-3">
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button variant="primary" size="sm" isLoading={busy}><Upload className="h-4 w-4" />{t("button")}</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed start-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="flex items-center gap-2 font-display text-xl font-semibold text-text"><FileSpreadsheet className="h-5 w-5 text-gold-primary" />{t("modalTitle")}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-text-muted">{t("modalDescription")}</Dialog.Description></div>
            <Dialog.Close className="rounded p-1 text-text-muted hover:bg-surface-muted hover:text-text" aria-label={t("cancel")}><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <div className="mt-5 rounded-lg border border-gold-primary/30 bg-gold-primary/5 p-4 text-sm text-text">
            <p className="font-semibold">{t("fileRequirements")}</p>
            <p className="mt-2 text-text-muted"><strong>{t("requiredColumns")}: </strong>{requiredFields.map((field) => t(`fields.${field}`)).join(", ")}</p>
            <p className="mt-1 text-text-muted"><strong>{t("optionalColumns")}: </strong>{templateFields.filter((field) => !requiredFields.includes(field)).map((field) => t(`fields.${field}`)).join(", ")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface p-3"><span className="text-xs text-text-muted">{t("templateHint")}</span><Button type="button" variant="secondary" size="sm" onClick={() => void downloadTemplate()}><Download className="h-4 w-4" />{t("template")}</Button></div>
          </div>
          <input ref={input} type="file" accept=".xlsx" className="hidden" aria-label={t("button")} onChange={(event) => { const file = event.target.files?.[0]; if (file) void read(file); }} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void read(file); }} className={`mt-5 flex min-h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-gold-primary bg-gold-primary/10" : "border-border-strong hover:border-gold-primary"}`}>
            <Upload className="mb-3 h-8 w-8 text-gold-primary" /><strong className="text-text">{t("dropTitle")}</strong><span className="mt-1 text-sm text-text-muted">{t("dropHint")}</span><span className="mt-3 text-sm font-semibold text-gold-primary">{t("browse")}</span>
          </button>
          {error && <p role="alert" className="mt-3 whitespace-pre-wrap text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end"><Dialog.Close asChild><Button variant="secondary" size="sm">{t("cancel")}</Button></Dialog.Close></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {success && <p role="status" className="text-sm text-text">{success}</p>}
    {!open && error && <p role="alert" className="whitespace-pre-wrap text-sm text-red-600">{error}</p>}
    {preview && <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <p className="font-semibold">{t("preview", { count: preview.cells.length })}</p>
      <p className="text-sm text-text-muted">{t("hint")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(preview.mapping).map(([field, column]) => <label key={field} className="flex flex-col gap-1 text-sm">{t(`fields.${field}`)}
          <select className="rounded border border-border bg-surface p-2 text-text" value={column} disabled={busy} onChange={(event) => setPreview({ ...preview, mapping: { ...preview.mapping, [field]: event.target.value } })}>
            <option value="">{t("ignore")}</option>
            {preview.headers.map((header, index) => <option value={index} key={index}>{index + 1}. {header}</option>)}
          </select>
        </label>)}
      </div>
      <div className="overflow-auto"><table className="w-full text-start text-sm"><thead><tr>{preview.headers.map((header, index) => <th className="p-2 text-start" key={index}>{header}</th>)}</tr></thead><tbody>{preview.cells.slice(0, 5).map((row, index) => <tr key={index}>{row.map((cell, column) => <td className="max-w-56 truncate p-2" key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
      <div className="flex gap-2"><Button onClick={save} isLoading={busy}>{t("confirm")}</Button><Button variant="secondary" disabled={busy} onClick={() => setPreview(null)}>{t("cancel")}</Button></div>
    </div>}
  </div>;
}
