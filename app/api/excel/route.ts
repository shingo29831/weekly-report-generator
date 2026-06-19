export const runtime = 'edge';
// @ai-role: API route to handle Excel generation requests and return file blobs

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
    
    return new NextResponse(excelBuffer, {
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