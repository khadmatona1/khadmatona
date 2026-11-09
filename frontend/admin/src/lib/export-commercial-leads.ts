import ExcelJS from "exceljs";
import type { CommercialLead } from "@/types/commercial-lead";

export interface CommercialLeadExportLabels {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  address: string;
  position: string;
  professionalType: string;
  status: string;
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
 * no server round-trip needed) and triggers a download - entirely in the
 * browser, so it works with whatever's already been fetched/filtered.
 */
export async function exportCommercialLeadsToExcel(
  leads: CommercialLead[],
  labels: CommercialLeadExportLabels,
  translateProfessionalType: (value: CommercialLead["professional_type"]) => string,
  translateStatus: (value: CommercialLead["status"]) => string,
  filename = "commercial-leads.xlsx",
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = [
    { header: labels.fullName, key: "fullName", width: 24 },
    { header: labels.companyName, key: "companyName", width: 24 },
    { header: labels.email, key: "email", width: 28 },
    { header: labels.phone, key: "phone", width: 18 },
    { header: labels.whatsapp, key: "whatsapp", width: 18 },
    { header: labels.city, key: "city", width: 18 },
    { header: labels.address, key: "address", width: 28 },
    { header: labels.position, key: "position", width: 20 },
    { header: labels.professionalType, key: "professionalType", width: 22 },
    { header: labels.status, key: "status", width: 16 },
    { header: labels.message, key: "message", width: 40 },
    { header: labels.submittedOn, key: "submittedOn", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const lead of leads) {
    sheet.addRow({
      fullName: lead.full_name,
      companyName: lead.company_name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      whatsapp: lead.whatsapp ?? "",
      city: lead.city ?? "",
      address: lead.address ?? "",
      position: lead.position ?? "",
      professionalType: translateProfessionalType(lead.professional_type),
      status: translateStatus(lead.status),
      message: lead.message ?? "",
      submittedOn: dateFormatter.format(new Date(lead.created_at)),
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
