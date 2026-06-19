export const runtime = 'edge';
// @ai-role: API route to handle Excel generation requests and return file blobs
// HTTPヘッダーの制約（ASCII文字のみ）を回避するため、ファイル名をURLエンコードしてContent-Dispositionに設定

import { NextResponse } from "next/server";
import { generateExcelFile } from "@/lib/excelHelper";
import { settingsSchema, formattedReportSchema } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const settingsStr = formData.get("settings");
    const reportStr = formData.get("report");
    const startDateStr = formData.get("startDate");
    const endDateStr = formData.get("endDate");

    if (!settingsStr || !reportStr || !startDateStr || !endDateStr) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    const settings = settingsSchema.parse(JSON.parse(settingsStr as string));
    const report = formattedReportSchema.parse(JSON.parse(reportStr as string));
    
    const file = formData.get("file") as File | null;
    const defaultTemplateFile = formData.get("defaultTemplate") as File | null;
    const imageFile = formData.get("image") as File | null;

    let buffer = null;
    if (file) {
      buffer = await file.arrayBuffer();
    }

    let defaultBuffer = null;
    if (defaultTemplateFile) {
      defaultBuffer = await defaultTemplateFile.arrayBuffer();
    } else {
      throw new Error("Default template is missing in request.");
    }

    let imageBuffer = null;
    let imageExtension = null;
    if (imageFile) {
      imageBuffer = await imageFile.arrayBuffer();
      const ext = imageFile.name.split('.').pop();
      imageExtension = ext ? ext.toLowerCase() : 'png';
    }

    const startDate = new Date(startDateStr as string);
    const endDate = new Date(endDateStr as string);

    const excelBuffer = await generateExcelFile(buffer, defaultBuffer, settings, report, imageBuffer, imageExtension, startDate, endDate);
    
    const fileName = `卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error: any) {
    console.error("Excel Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel file" }, { status: 500 });
  }
}