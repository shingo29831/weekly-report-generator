export const runtime = 'edge';
// @ai-role: API route to handle Excel generation requests and return file blobs

import { NextResponse } from "next/server";
import { generateExcelFile } from "@/lib/excelHelper";
import { settingsSchema } from "@/lib/schema";
import { z } from "zod";

const formattedReportSchema = z.object({
  progress: z.string(),
  issues: z.string(),
  nextWeek: z.string(),
  trouble: z.string(),
  memberProgress: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const settingsStr = formData.get("settings");
    const reportStr = formData.get("report");
    
    if (!settingsStr || !reportStr) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    // Input validation
    const settings = settingsSchema.parse(JSON.parse(settingsStr as string));
    const report = formattedReportSchema.parse(JSON.parse(reportStr as string));
    const file = formData.get("file") as File | null;

    let buffer = null;
    if (file) {
      buffer = await file.arrayBuffer();
    }

    const excelBuffer = await generateExcelFile(buffer, settings, report);
    
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