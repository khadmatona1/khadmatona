import ExcelJS from "exceljs";
import JSZip from "jszip";

/** ExcelJS expects unprefixed SpreadsheetML tags, even in valid prefixed exports. */
export async function readImportWorkbook(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
  const archive = await JSZip.loadAsync(buffer);
  let changed = false;
  for (const entry of Object.values(archive.files)) {
    if (entry.dir || !entry.name.startsWith("xl/") || !entry.name.endsWith(".xml")) continue;
    const xml = await entry.async("string");
    const prefixes = Array.from(xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)=["']http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main["']/g), (match) => match[1]);
    let normalized = xml;
    for (const prefix of prefixes) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      normalized = normalized.replace(new RegExp(`<(/?)${escaped}:`, "g"), "<$1");
    }
    if (normalized !== xml) { archive.file(entry.name, normalized); changed = true; }
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(changed ? await archive.generateAsync({ type: "arraybuffer" }) : buffer);
  return workbook;
}
