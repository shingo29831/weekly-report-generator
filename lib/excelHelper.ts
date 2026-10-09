// @ai-role: server-side logic for manipulating Excel files, compatible with Edge runtime (no fs/path)

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { Settings, FormattedReport } from "./schema";

// 手本シートのフォントや罫線・背景色を維持したまま値を安全に設定する
const setCellValuePreservingStyle = (cell: ExcelJS.Cell, value: any, ensureWrap = false) => {
  cell.value = value;
  if (ensureWrap) {
    cell.alignment = {
      ...(cell.alignment || {}),
      wrapText: true,
      vertical: cell.alignment?.vertical || 'top',
    };
  }
};

const findMasterTemplateSheet = (wb: ExcelJS.Workbook): ExcelJS.Worksheet => {
  return (
    wb.getWorksheet("ひな形（このシートをコピー）") ||
    wb.worksheets.find(s => s.name === "ひな形（このシートをコピー）") ||
    wb.worksheets.find(s => s.name.includes("ひな形")) ||
    wb.worksheets[0]
  );
};

const parseCellCoord = (addr: string): { col: number; row: number } => {
  const match = addr.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return { col: 10, row: 8 };
  const colLetters = match[1].toUpperCase();
  const row = parseInt(match[2], 10);
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return { col, row };
};

const colToLetter = (col: number): string => {
  let temp = col;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
};

// 手本シートの構造・行高・列幅・書式スタイルを寸分違わず完全複製
const copySheetStructure = (srcSheet: ExcelJS.Worksheet, destSheet: ExcelJS.Worksheet) => {
  destSheet.properties = { ...srcSheet.properties };
  destSheet.pageSetup = { ...srcSheet.pageSetup };
  destSheet.views = srcSheet.views ? JSON.parse(JSON.stringify(srcSheet.views)) : [];

  srcSheet.columns.forEach((col, index) => {
    const newCol = destSheet.getColumn(index + 1);
    if (col.width !== undefined) newCol.width = col.width;
    if (col.hidden !== undefined) newCol.hidden = col.hidden;
    if (col.style) newCol.style = JSON.parse(JSON.stringify(col.style));
  });

  srcSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const newRow = destSheet.getRow(rowNumber);
    if (row.height !== undefined) newRow.height = row.height;
    if (row.hidden !== undefined) newRow.hidden = row.hidden;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.value = cell.value;
      if (cell.font) newCell.font = JSON.parse(JSON.stringify(cell.font));
      if (cell.alignment) newCell.alignment = JSON.parse(JSON.stringify(cell.alignment));
      if (cell.border) newCell.border = JSON.parse(JSON.stringify(cell.border));
      if (cell.fill) newCell.fill = JSON.parse(JSON.stringify(cell.fill));
      if (cell.numFmt) newCell.numFmt = cell.numFmt;
    });
  });

  const merges = (srcSheet.model as any)?.merges;
  if (merges && Array.isArray(merges)) {
    merges.forEach((merge: string) => {
      try {
        destSheet.mergeCells(merge);
      } catch {
        // 重複結合を防止
      }
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
  startDate: Date,
  endDate: Date
): Promise<ArrayBuffer> => {
  let workbook = new ExcelJS.Workbook();
  const defaultWorkbook = new ExcelJS.Workbook();
  await defaultWorkbook.xlsx.load(defaultTemplateBuffer);

  if (baseFileBuffer) {
    await workbook.xlsx.load(baseFileBuffer);
  } else {
    workbook = defaultWorkbook;
  }

  // 最新テンプレートから「ひな形（このシートをコピー）」を手本として確定
  const masterTemplateSheet = findMasterTemplateSheet(defaultWorkbook);
  if (!masterTemplateSheet) throw new Error("手本となる「ひな形（このシートをコピー）」シートが見つかりません。");

  let templateSheet = findMasterTemplateSheet(workbook);

  // 提出ファイルに手本シートがない場合は先頭に手本シートを正確な名前で復元
  if (!templateSheet) {
    const orderedWorkbook = new ExcelJS.Workbook();
    const newTemplateSheet = orderedWorkbook.addWorksheet(masterTemplateSheet.name);
    copySheetStructure(masterTemplateSheet, newTemplateSheet);
    templateSheet = newTemplateSheet;

    workbook.worksheets.forEach(sheet => {
      const newSheet = orderedWorkbook.addWorksheet(sheet.name);
      copySheetStructure(sheet, newSheet);
    });

    workbook = orderedWorkbook;
  }

  // ユーザーが明示的に指定した週初めの日付を基準にシート名を決定
  const sheetName = `${format(startDate, "MMdd")}週`;

  let targetSheet = workbook.getWorksheet(sheetName);
  if (!targetSheet) {
    targetSheet = workbook.addWorksheet(sheetName);
    copySheetStructure(masterTemplateSheet, targetSheet);
  }

  // 手本シートのデザイン・書式を破壊せず値のみを設定
  setCellValuePreservingStyle(targetSheet.getCell("B2"), settings.groupNumber.replace(/[^0-9]/g, ""));
  setCellValuePreservingStyle(targetSheet.getCell("F2"), format(startDate, "yyyy/MM/dd"));
  setCellValuePreservingStyle(targetSheet.getCell("H2"), format(endDate, "yyyy/MM/dd"));
  setCellValuePreservingStyle(targetSheet.getCell("B8"), report.progress || "", true);
  
  const issueAndNextText = `${report.issues || ""}\n\n【来週やること】\n${report.nextWeek || ""}\n【今週の一番困ってること】\n${report.trouble || ""}`;
  setCellValuePreservingStyle(targetSheet.getCell("B11"), issueAndNextText, true);

  let row = 16;
  for (const member of settings.members) {
    if (row > 21) break;
    setCellValuePreservingStyle(targetSheet.getCell(`B${row}`), member.id);
    setCellValuePreservingStyle(targetSheet.getCell(`C${row}`), member.name);

    const tempRole = report.memberRoles?.[member.id];
    const defaultRole = member.role;
    const roleText = tempRole || defaultRole || "";

    let progressValue = report.memberProgress[member.id] || "";
    if (roleText) {
      progressValue = `【${roleText}作業を担当】\n${progressValue}`.trim();
    }
    
    setCellValuePreservingStyle(targetSheet.getCell(`D${row}`), progressValue, true);
    row++;
  }

  // J8枠のセル範囲をテンプレートの結合情報から特定し、枠サイズに完全追従させる
  if (imageBuffer) {
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: (imageExtension || 'png') as any,
    });

    const merges: string[] =
      (targetSheet.model as any)?.merges ||
      (templateSheet.model as any)?.merges ||
      [];

    const j8Merge =
      merges.find((m: string) => m.split(':')[0]?.toUpperCase() === 'J8') ||
      merges.find((m: string) => {
        const parts = m.split(':');
        if (parts.length !== 2) return false;
        const s = parseCellCoord(parts[0]);
        const e = parseCellCoord(parts[1]);
        return 10 >= s.col && 10 <= e.col && 8 >= s.row && 8 <= e.row;
      });

    if (j8Merge) {
      targetSheet.addImage(imageId, j8Merge);
    } else {
      const maxCol = Math.max(targetSheet.columnCount || 0, templateSheet.columnCount || 0, 20);
      const maxRow = Math.max(targetSheet.rowCount || 0, 21);
      const endColLetter = colToLetter(maxCol);
      targetSheet.addImage(imageId, `J8:${endColLetter}${maxRow}`);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
};