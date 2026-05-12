// @ai-role: server-side logic for manipulating Excel files

import ExcelJS from "exceljs";
import { format, startOfWeek, endOfWeek } from "date-fns";
import fs from "fs";
import path from "path";
import { Settings, FormattedReport } from "./schema";

export const generateExcelFile = async (
  baseFileBuffer: ArrayBuffer | null,
  settings: Settings,
  report: FormattedReport,
  targetDate: Date = new Date()
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();

  if (baseFileBuffer) {
    await workbook.xlsx.load(baseFileBuffer);
  } else {
    const publicPath = path.join(process.cwd(), "public", "template.xlsx");
    const rootPath = path.join(process.cwd(), "template.xlsx");
    
    if (fs.existsSync(publicPath)) {
      await workbook.xlsx.readFile(publicPath);
    } else if (fs.existsSync(rootPath)) {
      await workbook.xlsx.readFile(rootPath);
    } else {
      throw new Error("テンプレートファイルが見つかりません。プロジェクトのルートまたは public/ に 'template.xlsx' を配置してください。");
    }
  }

  const templateSheet = workbook.worksheets.find(sheet => sheet.name.includes("ひな形"));
  if (!templateSheet) {
    const availableSheets = workbook.worksheets.map(s => s.name).join(", ");
    throw new Error(`「ひな形」シートが見つかりません。現在のシート: ${availableSheets}`);
  }

  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });
  const sheetName = format(start, "MMdd");

  let targetSheet = workbook.getWorksheet(sheetName);
  if (!targetSheet) {
    targetSheet = workbook.addWorksheet(sheetName);
    // 根本解決: モデルをコピーする際、新しいシート名を明示的に指定して重複エラーを防ぐ
    targetSheet.model = Object.assign({}, templateSheet.model, {
      mergeCells: (templateSheet.model as any).mergeCells,
      name: sheetName,
    });
  }

  targetSheet.getCell("B2").value = `${settings.groupNumber}班`;
  targetSheet.getCell("E2").value = format(start, "yyyy-MM-dd");
  targetSheet.getCell("G2").value = format(end, "yyyy-MM-dd");
  targetSheet.getCell("B6").value = report.progress || "";
  targetSheet.getCell("B10").value = `${report.issues || ""}\n\n【来週やること】\n${report.nextWeek || ""}\n【今週の一番困ってること】\n${report.trouble || ""}`;

  let row = 16;
  for (const member of settings.members) {
    targetSheet.getCell(`B${row}`).value = member.id;
    targetSheet.getCell(`C${row}`).value = member.name;
    targetSheet.getCell(`D${row}`).value = report.memberProgress[member.id] || "";
    row++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};