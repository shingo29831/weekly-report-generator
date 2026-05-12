export const runtime = 'edge';
// @ai-role: API route to handle Excel generation requests and return file blobs
// HTTPヘッダーの制約（ASCII文字のみ）を回避するため、ファイル名をURLエンコードしてContent-Dispositionに設定

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
    
    // 日本語ファイル名をHTTPヘッダーで安全に送信するためのエンコード処理
    const fileName = `卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // filename* を使用してUTF-8のエンコード済み文字列をブラウザに解釈させる（フォールバックとして filename="report.xlsx" を指定）
        "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error: any) {
    console.error("Excel Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel file" }, { status: 500 });
  }
}