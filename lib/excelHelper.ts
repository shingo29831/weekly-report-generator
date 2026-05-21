// @ai-role: server-side logic for manipulating Excel files, compatible with Edge runtime (no fs/path)

import ExcelJS from "exceljs";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Settings, FormattedReport } from "./schema";

const applyInputStyle = (cell: ExcelJS.Cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDAF2D0' }
  };
  cell.alignment = {
    wrapText: true,
    vertical: 'top',
    horizontal: 'left'
  };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
};

export const generateExcelFile = async (
  baseFileBuffer: ArrayBuffer | null,
  defaultTemplateBuffer: ArrayBuffer,
  settings: Settings,
  report: FormattedReport,
  targetDate: Date = new Date()
): Promise<ArrayBuffer> => {
  let workbook = new ExcelJS.Workbook();
  const defaultWorkbook = new ExcelJS.Workbook();
  await defaultWorkbook.xlsx.load(defaultTemplateBuffer);

  if (baseFileBuffer) {
    await workbook.xlsx.load(baseFileBuffer);
  } else {
    workbook = defaultWorkbook;
  }

  let templateSheet = workbook.worksheets.find(sheet => sheet.name.includes("ひな形"));
  if (!templateSheet) {
    const defaultTemplateSheet = defaultWorkbook.worksheets.find(sheet => sheet.name.includes("ひな形"));
    if (!defaultTemplateSheet) throw new Error("デフォルトの「ひな形」シートが見つかりません。");

    templateSheet = workbook.addWorksheet("ひな形");
    
    templateSheet.properties = defaultTemplateSheet.properties;
    templateSheet.pageSetup = defaultTemplateSheet.pageSetup;
    templateSheet.views = defaultTemplateSheet.views;

    defaultTemplateSheet.columns.forEach((col, index) => {
      const newCol = templateSheet!.getColumn(index + 1);
      newCol.width = col.width;
      if (col.style) {
        newCol.style = col.style;
      }
    });

    defaultTemplateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = templateSheet!.getRow(rowNumber);
      newRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        if (cell.style) {
          newCell.style = cell.style;
        }
      });
    });

    const merges = (defaultTemplateSheet.model as any).merges;
    if (merges && Array.isArray(merges)) {
      merges.forEach((merge: string) => {
        templateSheet!.mergeCells(merge);
      });
    }
  }

  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });
  const sheetName = `${format(start, "MMdd")}週`;

  let targetSheet = workbook.getWorksheet(sheetName);
  if (!targetSheet) {
    targetSheet = workbook.addWorksheet(sheetName);
    
    targetSheet.properties = templateSheet.properties;
    targetSheet.pageSetup = templateSheet.pageSetup;
    targetSheet.views = templateSheet.views;

    templateSheet.columns.forEach((col, index) => {
      const newCol = targetSheet!.getColumn(index + 1);
      newCol.width = col.width;
      if (col.style) {
        newCol.style = col.style;
      }
    });

    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = targetSheet!.getRow(rowNumber);
      newRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        if (cell.style) {
          newCell.style = cell.style;
        }
      });
    });

    const merges = (templateSheet.model as any).merges;
    if (merges && Array.isArray(merges)) {
      merges.forEach((merge: string) => {
        targetSheet!.mergeCells(merge);
      });
    }
  }

  const cellB2 = targetSheet.getCell("B2");
  cellB2.value = settings.groupNumber.replace(/[^0-9]/g, "");
  applyInputStyle(cellB2);
  
  const cellF2 = targetSheet.getCell("F2");
  cellF2.value = format(start, "yyyy/MM/dd");
  applyInputStyle(cellF2);

  const cellH2 = targetSheet.getCell("H2");
  cellH2.value = format(end, "yyyy/MM/dd");
  applyInputStyle(cellH2);

  const cellB8 = targetSheet.getCell("B8");
  cellB8.value = report.progress || "";
  applyInputStyle(cellB8);
  
  const cellB11 = targetSheet.getCell("B11");
  cellB11.value = `${report.issues || ""}\n\n【来週やること】\n${report.nextWeek || ""}\n【今週の一番困ってること】\n${report.trouble || ""}`;
  applyInputStyle(cellB11);

  let row = 16;
  for (const member of settings.members) {
    if (row > 21) break;
    const cellID = targetSheet.getCell(`B${row}`);
    cellID.value = member.id;
    applyInputStyle(cellID);

    const cellName = targetSheet.getCell(`C${row}`);
    cellName.value = member.name;
    applyInputStyle(cellName);

    const cellProgress = targetSheet.getCell(`D${row}`);
    const tempRole = report.memberRoles?.[member.id];
    const defaultRole = member.role;
    const roleText = tempRole || defaultRole || "";

    let progressValue = report.memberProgress[member.id] || "";
    if (roleText) {
      progressValue = `【${roleText}作業を担当】\n${progressValue}`.trim();
    }
    
    cellProgress.value = progressValue;
    applyInputStyle(cellProgress);
    row++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
};