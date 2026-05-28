// @ai-role: custom hook managing state, real-time validation, and template persistence (Edge compatible)

import { useState, useEffect } from "react";
import { Settings, ReportInput, FormattedReport, Member } from "@/lib/schema";
import ExcelJS from "exceljs";
import { format, startOfWeek, addDays, parseISO } from "date-fns";

export interface TemplateState {
  source: "default" | "uploaded" | "generated";
  name: string;
  timestamp?: string;
  dataUrl?: string;
  file?: File;
}

const DEFAULT_SETTINGS: Settings = {
  groupNumber: "0",
  theme: "AIタスク管理アプリ",
  themeDetails: "ユーザーの入力に基づいてAIが自動でタスクの優先度を判定し、スケジュールを最適化するWebアプリケーションの開発。",
  members: [
    { id: "1", name: "情報 太郎", role: "UI設計" },
    { id: "2", name: "技術 花子", role: "API連携" },
    { id: "3", name: "開発 次郎", role: "DB構築" }
  ],
};

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const useReportApp = () => {
  const initialStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const initialEnd = addDays(initialStart, 4);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [startDate, setStartDate] = useState<string>(format(initialStart, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(initialEnd, "yyyy-MM-dd"));
  const [input, setInput] = useState<ReportInput>( { 
    freeMemo: "", 
    progressRough: "", 
    issuesRough: "", 
    nextWeekRough: "",
    memberProgressRough: {},
    memberRolesRough: {}
  });
  const [formattedReport, setFormattedReport] = useState<FormattedReport | null>(null);
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [pastReportsContext, setPastReportsContext] = useState<string>("");
  
  const [templateState, setTemplateState] = useState<TemplateState>({
    source: "default",
    name: "プロジェクト内テンプレート (template.xlsx)"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState<string>("");
  const [isJsonValid, setIsJsonValid] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reportSettings");
    if (saved) setSettings(JSON.parse(saved));

    const savedTemplate = localStorage.getItem("reportTemplate");
    if (savedTemplate) {
      try {
        const parsed = JSON.parse(savedTemplate);
        setTemplateState({
          source: "generated",
          name: parsed.name,
          timestamp: parsed.timestamp,
          dataUrl: parsed.dataUrl
        });
      } catch (e) {
        console.error("Failed to parse saved template");
      }
    }
  }, []);

  // テンプレート更新時に過去3週分のデータを抽出してAIコンテキストとして保持する
  useEffect(() => {
    extractPastReports(templateState);
  }, [templateState]);

  const extractPastReports = async (source: TemplateState) => {
    try {
      let buffer: ArrayBuffer;
      if (source.source === "uploaded" && source.file) {
        buffer = await source.file.arrayBuffer();
      } else if (source.source === "generated" && source.dataUrl) {
        const file = dataURLtoFile(source.dataUrl, source.name);
        buffer = await file.arrayBuffer();
      } else {
        const res = await fetch("/template.xlsx");
        if (!res.ok) return;
        buffer = await res.arrayBuffer();
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const pastReports = [];
      
      for (const sheet of workbook.worksheets) {
        if (sheet.name.includes("ひな形")) continue;
        
        const progress = sheet.getCell("B8").value?.toString() || "";
        const issuesAndNext = sheet.getCell("B11").value?.toString() || "";
        const dateRange = `${sheet.getCell("F2").value?.toString() || ""} 〜 ${sheet.getCell("H2").value?.toString() || ""}`;
        
        let dateVal = 0;
        const f2Val = sheet.getCell("F2").value;
        if (f2Val instanceof Date) {
          dateVal = f2Val.getTime();
        } else if (typeof f2Val === "string") {
          const parsedDate = new Date(f2Val);
          if (!isNaN(parsedDate.getTime())) dateVal = parsedDate.getTime();
        }
        if (dateVal === 0) dateVal = sheet.id; // フォールバック

        let memberProgress = "";
        for (let row = 16; row <= 21; row++) {
          const name = sheet.getCell(`C${row}`).value?.toString() || "";
          const prog = sheet.getCell(`D${row}`).value?.toString() || "";
          if (name && prog) {
            memberProgress += `- ${name}: ${prog}\n`;
          }
        }

        pastReports.push({ sheetName: sheet.name, dateRange, dateVal, progress, issuesAndNext, memberProgress });
      }

      pastReports.sort((a, b) => b.dateVal - a.dateVal);
      const recent3 = pastReports.slice(0, 3);
      
      let contextStr = "";
      if (recent3.length > 0) {
        contextStr = "【過去のデータ（新しい順）】※差分の識別に利用してください\n";
        recent3.forEach((report, index) => {
          contextStr += `--- 前回から ${index + 1} つ前のデータ ---\n`;
          contextStr += `シート名・期間: ${report.sheetName} (${report.dateRange})\n`;
          contextStr += `チーム進捗:\n${report.progress}\n`;
          contextStr += `チーム課題・次やること:\n${report.issuesAndNext}\n`;
          contextStr += `メンバー別進捗:\n${report.memberProgress}\n\n`;
        });
      }
      
      setPastReportsContext(contextStr);
    } catch (error) {
      console.error("過去レポートの抽出に失敗しました", error);
      setPastReportsContext("");
    }
  };

  useEffect(() => {
    if (!jsonInput.trim()) {
      setIsJsonValid(false);
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.progress !== undefined || Array.isArray(parsed.members)) {
        const parsedMemberProgress: Record<string, string> = {};
        const parsedMemberRoles: Record<string, string> = {};
        if (Array.isArray(parsed.members)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parsed.members.forEach((m: any) => {
            if (m.id) {
              parsedMemberProgress[m.id] = m.progress || "";
              if (m.role) {
                parsedMemberRoles[m.id] = m.role;
              }
            }
          });
        }
        setFormattedReport({
          progress: parsed.progress || "",
          issues: parsed.issues || "",
          nextWeek: parsed.nextWeek || "",
          trouble: parsed.trouble || "",
          memberProgress: parsedMemberProgress,
          memberRoles: parsedMemberRoles,
          updatedThemeDetails: parsed.updatedThemeDetails || settings.themeDetails,
        });
        setIsJsonValid(true);
      } else {
        setIsJsonValid(false);
      }
    } catch (e) {
      setIsJsonValid(false);
    }
  }, [jsonInput]);

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("reportSettings", JSON.stringify(newSettings));
  };

  const updateFormattedReportField = (field: keyof Omit<FormattedReport, "memberProgress" | "memberRoles">, value: string) => {
    if (formattedReport) setFormattedReport({ ...formattedReport, [field]: value });
  };

  const updateMemberProgress = (id: string, value: string) => {
    if (formattedReport) {
      setFormattedReport({
        ...formattedReport,
        memberProgress: { ...formattedReport.memberProgress, [id]: value }
      });
    }
  };

  const updateMemberRole = (id: string, value: string) => {
    if (formattedReport) {
      setFormattedReport({
        ...formattedReport,
        memberRoles: { ...formattedReport.memberRoles, [id]: value }
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateState({ source: "uploaded", name: file.name, file });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportImage(file);
    }
  };

  const resetTemplate = () => {
    localStorage.removeItem("reportTemplate");
    setTemplateState({ source: "default", name: "プロジェクト内テンプレート (template.xlsx)" });
  };

  const importSettingsFromExcel = async () => {
    setIsLoading(true);
    try {
      let buffer: ArrayBuffer;
      if (templateState.source === "uploaded" && templateState.file) {
        buffer = await templateState.file.arrayBuffer();
      } else if (templateState.source === "generated" && templateState.dataUrl) {
        const file = dataURLtoFile(templateState.dataUrl, templateState.name);
        buffer = await file.arrayBuffer();
      } else {
        const res = await fetch("/template.xlsx");
        if (!res.ok) throw new Error("基準となるファイルが見つかりません。");
        buffer = await res.arrayBuffer();
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.getWorksheet("0420週") || 
                    workbook.worksheets.find(s => s.name.includes("ひな形")) || 
                    workbook.worksheets[0];

      if (!sheet) throw new Error("有効なワークシートが見つかりません。");

      // セルB2から班番号の値をパース
      const rawGroupNumber = sheet.getCell("B2").value?.toString().trim() || "";
      const parsedGroupNumber = rawGroupNumber ? rawGroupNumber.replace(/[^0-9]/g, "") : settings.groupNumber;

      const newMembers: Member[] = [];
      for (let row = 16; row <= 21; row++) {
        const id = sheet.getCell(`B${row}`).value?.toString().trim() || "";
        const name = sheet.getCell(`C${row}`).value?.toString().trim() || "";
        if (id || name) {
          newMembers.push({ id, name });
        }
      }

      if (newMembers.length > 0) {
        updateSettings({ ...settings, groupNumber: parsedGroupNumber, members: newMembers });
        return true;
      } else {
        throw new Error("指定されたセル（B16:C21）にメンバー情報が見つかりませんでした。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`読み込みエラー: ${message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = async (): Promise<boolean> => {
    const currentReport: FormattedReport = formattedReport || {
      progress: input.progressRough,
      issues: input.issuesRough,
      nextWeek: input.nextWeekRough || "",
      trouble: "",
      memberProgress: input.memberProgressRough,
      memberRoles: input.memberRolesRough || {},
    };

    setIsLoading(true);
    try {
      const formData = new FormData();
      
      let currentSettings = settings;
      // AIによって詳細設定のベース部分が更新されていれば適用する
      if (currentReport.updatedThemeDetails && currentReport.updatedThemeDetails !== settings.themeDetails) {
        currentSettings = { ...settings, themeDetails: currentReport.updatedThemeDetails };
        updateSettings(currentSettings);
      }

      formData.append("settings", JSON.stringify(currentSettings));
      formData.append("report", JSON.stringify(currentReport));
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      
      const defaultRes = await fetch("/template.xlsx");
      if (!defaultRes.ok) throw new Error("初期テンプレートファイルの取得に失敗しました。");
      const defaultBlob = await defaultRes.blob();
      formData.append("defaultTemplate", defaultBlob, "template.xlsx");

      if (templateState.source === "uploaded" && templateState.file) {
        formData.append("file", templateState.file);
      } else if (templateState.source === "generated" && templateState.dataUrl) {
        const file = dataURLtoFile(templateState.dataUrl, templateState.name);
        formData.append("file", file); // 修正箇所：誤ってbuffer = file.arrayBuffer()としていた箇所を修正
      } else if (templateState.source === "default") {
        formData.append("file", defaultBlob, "template.xlsx");
      }

      if (reportImage) {
        formData.append("image", reportImage);
      }

      const res = await fetch("/api/excel", { method: "POST", body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "生成失敗");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fileName = `卒業研究（2026前期）週報_${currentSettings.groupNumber}班.xlsx`;
      
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const timestamp = new Date().toLocaleString("ja-JP");
        const newState: TemplateState = {
          source: "generated",
          name: fileName,
          timestamp,
          dataUrl: base64data
        };
        setTemplateState(newState);
        try {
          localStorage.setItem("reportTemplate", JSON.stringify({
            name: fileName,
            timestamp,
            dataUrl: base64data
          }));
        } catch(e) {
          console.warn("ローカルストレージの容量制限に達したため、テンプレートを保存できませんでした。", e);
        }
      };
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateManualPrompts = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const currentWeekStr = `${format(start, "yyyy/MM/dd")} 〜 ${format(end, "yyyy/MM/dd")}`;

    const currentProgress = formattedReport?.progress || input.freeMemo || input.progressRough;
    const memberListContext = settings.members.map(m => {
      const roleText = m.role ? ` (デフォルト担当: ${m.role})` : "";
      return `- ${m.name} (出席番号: ${m.id})${roleText}`;
    }).join("\n");
    
    const memberProgressList = settings.members.map(m => {
      const progress = formattedReport?.memberProgress[m.id] || input.memberProgressRough[m.id] || "";
      const tempRole = formattedReport?.memberRoles?.[m.id] || input.memberRolesRough?.[m.id] || "";
      const roleText = tempRole ? ` (一時的な担当: ${tempRole})` : "";
      return `- ${m.name} (${m.id})${roleText}: ${progress}`;
    }).filter(line => !line.endsWith(": ")).join("\n");

    const jsonPrompt = `以下の情報を元に、週報のデータを指定されたJSONフォーマットで出力してください。

【対象期間（今週）】
${currentWeekStr} (月曜日〜金曜日)

【先生からの要求事項（週報で必ず満たすこと）】
以下の要素を各項目に必ず盛り込んでください。
・進捗（完了した作業、進行中の作業、未着手の作業）
・差分（過去のデータから、新しくやったこと、終わったこと、変わってないこと）
・問題、リスク（発生した問題、つまりそうなリスク、影響範囲(やばさ)。※問題がない場合は順調な理由などを記載）
・次のアクション（誰が何をどこまでやるか。※タスクは具体的で終わりが見えるように）

【チーム構成とプロジェクト概要】
テーマ: ${settings.theme}
現在の詳細設定（プロジェクトのベース部分）:
${settings.themeDetails}
メンバーリスト:
${memberListContext}

${pastReportsContext}

【今回の入力情報】
自由記述メモ（全体）: ${input.freeMemo || "特筆事項なし"}
チーム全体の進捗メモ（詳細）: ${input.progressRough || "特筆事項なし"}
チーム全体の問題・リスクメモ（詳細）: ${input.issuesRough || "特筆事項なし"}
チーム全体の来週やることメモ（詳細）: ${input.nextWeekRough || "特筆事項なし"}
各メンバーの個別メモ（進捗、差分、問題、次やること）:
${memberProgressList || "特筆事項なし"}

【推論要件】
1. 情報の統合と振り分け: 「先生からの要求事項」に基づき、「自由記述メモ」や「各詳細メモ」の内容を分析してください。特定の個人の作業と判明したものは個人の報告に振り分け、それ以外の全体概要を「progress」等に記載してください。
2. 表現の最適化: チーム全体の報告および各メンバーの個別の報告はすべて箇条書きで記述し、IT知識がある程度ある人が現状を大まかに把握できる内容にしてください。また、専門すぎる用語は誰でも分かるように言い換えてください（例：「YOLO」→「物体検知AI」など）。
3. ベース情報の自動アップデート: 「現在の詳細設定（プロジェクトのベース部分）」に、今回の進捗や過去のコンテキストから得られた「プロジェクトの不変な部分（技術スタック、アーキテクチャの決定事項、主要な要件など）」を自動で追記・整理し、「updatedThemeDetails」として出力してください。
4. JSONテキストのみを出力すること。

{
  "progress": "チーム全体の進捗と差分",
  "issues": "今週の課題とリスク",
  "nextWeek": "来週やること（次のアクション）",
  "trouble": "今週一番困ってること（影響範囲）",
  "updatedThemeDetails": "最新化されたプロジェクトの詳細設定（ベース部分）",
  "members": [ { "id": "...", "name": "...", "role": "今週の一時的な担当(判明した場合のみ)", "progress": "..." } ]
}`;

    const imageFileName = `週報図解_${settings.groupNumber}班${new Date().toISOString().slice(0,10).replace(/-/g,'')}週`;

    const imagePrompt = `# 依頼概要

あなたは専門学校の卒業研究支援AIです。

以下の週報情報をもとに、「他班や教員が一目で理解できる週次進捗ボード」を作成し画像で出力してください。

キャラクター的表現、雑談調、ロールプレイ、演出表現は禁止。

客観的かつ整理された資料として出力してください。
 
# 出力条件

・A3横向き1枚相当
・情報整理重視
・派手な装飾は禁止
・ビジネス資料風
・背景は白
・色数は少なめ
・進捗と課題がすぐ判別できる構成
・前週との差分が分かるようにする
・文章を減らし、要点を整理
・読みやすさ最優先
 
# レイアウト

左側：【班全体の進捗概要】
右上：【現在の課題・問題点】
右中央：【来週やること】
右下：【メンバー別進捗】
 
# 強調したいこと

・進捗停滞
・問題点
・役割分担
・前週との差分

※特に前週との差分、進捗停滞、新しく発生した問題を強調してください。
 
# 週報データ

対象期間: ${currentWeekStr}
テーマ: ${settings.theme}
今週の進捗: ${currentProgress}
今週の課題: ${formattedReport?.issues || input.issuesRough || "特筆事項なし"}
来週やること: ${formattedReport?.nextWeek || input.nextWeekRough || "特筆事項なし"}

各メンバーの個別進捗:
${memberProgressList || "特筆事項なし"}`;

    return { jsonPrompt, imagePrompt, imageFileName, pastReportsContext };
  };

  return {
    settings, updateSettings, input, setInput, formattedReport,
    updateFormattedReportField, updateMemberProgress, updateMemberRole,
    templateState, handleFileUpload, handleImageUpload, reportImage, resetTemplate,
    isLoading, jsonInput, setJsonInput, 
    isJsonValid, downloadExcel, generateManualPrompts,
    importSettingsFromExcel,
    startDate, setStartDate, endDate, setEndDate
  };
};