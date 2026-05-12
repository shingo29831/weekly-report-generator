// @ai-role: API route to handle Excel generation requests and return file blobs
// Node.jsのBuffer型と標準Fetch APIのBodyInit型の互換性エラーを回避するため型アサーションを使用

import { NextResponse } from "next/server";
import { generateExcelFile } from "@/lib/excelHelper";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const settings = JSON.parse(formData.get("settings") as string);
    const report = JSON.parse(formData.get("report") as string);
    const file = formData.get("file") as File | null;

    let buffer = null;
    if (file) {
      buffer = await file.arrayBuffer();
    }

    const excelBuffer = await generateExcelFile(buffer, settings, report);
    
    // Buffer型をBodyInitとして安全にキャスト
    return new NextResponse(excelBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Excel Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel file" }, { status: 500 });
  }
}