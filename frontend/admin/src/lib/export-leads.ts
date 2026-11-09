import ExcelJS from "exceljs";
import type { Lead, LeadType, LeadStatus } from "@/types/lead";

export interface LeadExportLabels {
  type: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  city: string;
  district: string;
  address: string;
  message: string;
  submittedOn: string;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Builds a .xlsx workbook client-side (exceljs ships its own browser build,
 * no server round-trip needed) and triggers a download - same shape as
 * export-commercial-leads.ts's exportCommercialLeadsToExcel().
 */
export async function exportLeadsToExcel(
  leads: Lead[],
  labels: LeadExportLabels,
  translateType: (value: LeadType) => string,
  translateStatus: (value: LeadStatus) => string,
  filename = "leads.xlsx",
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = [
    { header: labels.type, key: "type", width: 18 },
    { header: labels.name, key: "name", width: 24 },
    { header: labels.email, key: "email", width: 28 },
    { header: labels.phone, key: "phone", width: 18 },
    { header: labels.status, key: "status", width: 16 },
    { header: labels.city, key: "city", width: 18 },
    { header: labels.district, key: "district", width: 18 },
    { header: labels.address, key: "address", width: 28 },
    { header: labels.message, key: "message", width: 40 },
    { header: labels.submittedOn, key: "submittedOn", width: 20 },
    { header: "property_id", key: "property_id", width: 14 },
    { header: "callback_at", key: "callback_at", width: 26 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const lead of leads) {
    sheet.addRow({
      type: translateType(lead.type),
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? "",
      status: translateStatus(lead.status),
      city: lead.city ?? "",
      district: lead.district ?? "",
      address: lead.address ?? "",
      message: lead.message ?? "",
      submittedOn: dateFormatter.format(new Date(lead.created_at)),
      property_id: lead.property_id ?? "",
      callback_at: lead.callback_at ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
