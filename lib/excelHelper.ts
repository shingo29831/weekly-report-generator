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

// 異なるワークブック間やシート間でスタイル・構造を完全に複製するためのヘルパー
const copySheetStructure = (srcSheet: ExcelJS.Worksheet, destSheet: ExcelJS.Worksheet) => {
  destSheet.properties = srcSheet.properties;
  destSheet.pageSetup = srcSheet.pageSetup;
  destSheet.views = srcSheet.views;

  srcSheet.columns.forEach((col, index) => {
    const newCol = destSheet.getColumn(index + 1);
    newCol.width = col.width;
    if (col.style) {
      newCol.style = col.style;
    }
  });

  srcSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const newRow = destSheet.getRow(rowNumber);
    newRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.value = cell.value;
      if (cell.style) {
        newCell.style = cell.style;
      }
    });
  });

  const merges = (srcSheet.model as any).merges;
  if (merges && Array.isArray(merges)) {
    merges.forEach((merge: string) => {
      destSheet.mergeCells(merge);
    });
  }
};

export const generateExcelFile = async (
  baseFileBuffer: ArrayBuffer | null,
  defaultTemplateBuffer: ArrayBuffer,
  settings: Settings,
  report: FormattedReport,
  imageBuffer: ArrayBuffer | null,
  imageExtension: string | null,
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

  // 提出ファイルにひな形がない場合、先頭にひな形を挿入した状態の新ワークブックへ再構成する
  if (!templateSheet) {
    const defaultTemplateSheet = defaultWorkbook.worksheets.find(sheet => sheet.name.includes("ひな形"));
    if (!defaultTemplateSheet) throw new Error("デフォルトの「ひな形」シートが見つかりません。");

    const orderedWorkbook = new ExcelJS.Workbook();
    const newTemplateSheet = orderedWorkbook.addWorksheet("ひな形");
    copySheetStructure(defaultTemplateSheet, newTemplateSheet);
    templateSheet = newTemplateSheet;

    workbook.worksheets.forEach(sheet => {
      const newSheet = orderedWorkbook.addWorksheet(sheet.name);
      copySheetStructure(sheet, newSheet);
    });

    workbook = orderedWorkbook;
  }

  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });
  const sheetName = `${format(start, "MMdd")}週`;

  let targetSheet = workbook.getWorksheet(sheetName);
  if (!targetSheet) {
    targetSheet = workbook.addWorksheet(sheetName);
    copySheetStructure(templateSheet, targetSheet);
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

  // アップロードされた週報画像をJ8セル（インデックスベースでcol:9, row:7）の基準位置に固定配置
  if (imageBuffer) {
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: (imageExtension || 'png') as any,
    });
    targetSheet.addImage(imageId, {
      tl: { col: 9, row: 7 },
      ext: { width: 640, height: 452 }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
};