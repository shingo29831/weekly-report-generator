// @ai-role: API route to handle Excel generation requests and return file blobs

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
    
    // HTTPヘッダーの制約エラーを確実に防ぐため、ヘッダーにはASCII文字（半角英数字）のみを使用します。
    // ※ 実際のダウンロード時の日本語ファイル名は、フロントエンド側（useReportApp.tsのa.download）で指定されるため問題ありません。
    return new NextResponse(excelBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="weekly_report.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Excel Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel file" }, { status: 500 });
  }
}