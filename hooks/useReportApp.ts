// @ai-role: custom hook managing state, real-time validation, and template persistence (Edge compatible)

import { useState, useEffect } from "react";
import { Settings, ReportInput, FormattedReport } from "@/lib/schema";
import { fetchWithRetry } from "@/lib/apiClient";

export interface TemplateState {
  source: "default" | "uploaded" | "generated";
  name: string;
  timestamp?: string;
  dataUrl?: string;
  file?: File;
}

const DEFAULT_SETTINGS: Settings = {
  groupNumber: "4",
  theme: "マクロ最適化AI",
  themeDetails: "ユーザーが専門知識がなくても最適なマクロ生成できるようにするためAIに作業を理解させ、最適化されたマクロを生成する。",
  members: [
    { id: "8", name: "梅田 真吾" },
    { id: "9", name: "大津 幸輝" },
    { id: "13", name: "蟹江 りゅうた" },
    { id: "31", name: "林 楓也" },
    { id: "43", name: "吉田 誠司" },
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
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [input, setInput] = useState<ReportInput>({ freeMemo: "", progressRough: "", issuesRough: "", memberProgressRough: {} });
  const [formattedReport, setFormattedReport] = useState<FormattedReport | null>(null);
  
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

  useEffect(() => {
    if (!jsonInput.trim()) {
      setIsJsonValid(false);
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.progress !== undefined || Array.isArray(parsed.members)) {
        const parsedMemberProgress: Record<string, string> = {};
        if (Array.isArray(parsed.members)) {
          parsed.members.forEach((m: any) => {
            if (m.id) parsedMemberProgress[m.id] = m.progress || "";
          });
        }
        setFormattedReport({
          progress: parsed.progress || "",
          issues: parsed.issues || "",
          nextWeek: parsed.nextWeek || "",
          trouble: parsed.trouble || "",
          memberProgress: parsedMemberProgress,
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

  const updateFormattedReportField = (field: keyof Omit<FormattedReport, "memberProgress">, value: string) => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateState({ source: "uploaded", name: file.name, file });
    }
  };

  const resetTemplate = () => {
    localStorage.removeItem("reportTemplate");
    setTemplateState({ source: "default", name: "プロジェクト内テンプレート (template.xlsx)" });
  };

  const downloadExcel = async (): Promise<boolean> => {
    const currentReport = formattedReport || {
      progress: input.progressRough,
      issues: input.issuesRough,
      nextWeek: "",
      trouble: "",
      memberProgress: input.memberProgressRough,
    };

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("settings", JSON.stringify(settings));
      formData.append("report", JSON.stringify(currentReport));
      
      // テンプレートの付与ロジック（Cloudflare/Edge対応）
      if (templateState.source === "uploaded" && templateState.file) {
        formData.append("file", templateState.file);
      } else if (templateState.source === "generated" && templateState.dataUrl) {
        const file = dataURLtoFile(templateState.dataUrl, templateState.name);
        formData.append("file", file);
      } else if (templateState.source === "default") {
        // フロントエンドからpublicフォルダ内のテンプレートをフェッチして渡す
        const res = await fetch("/template.xlsx");
        if (!res.ok) throw new Error("初期テンプレートファイルの取得に失敗しました。publicディレクトリに template.xlsx を配置してください。");
        const blob = await res.blob();
        formData.append("file", blob, "template.xlsx");
      }

      const res = await fetch("/api/excel", { method: "POST", body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "生成失敗");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fileName = `卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx`;
      
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
    } catch (error: any) {
      alert(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateManualPrompts = () => {
    const currentProgress = formattedReport?.progress || input.freeMemo || input.progressRough;
    const memberListContext = settings.members.map(m => `- ${m.name} (出席番号: ${m.id})`).join("\n");
    const memberProgressList = settings.members.map(m => `- ${m.name} (${m.id}): ${input.memberProgressRough[m.id] || ""}`).filter(line => !line.endsWith(": ")).join("\n");

    const jsonPrompt = `以下の情報を元に、週報のデータを指定されたJSONフォーマットで出力してください。

【チーム構成とテーマ】
テーマ: ${settings.theme}
テーマ詳細: ${settings.themeDetails}
メンバーリスト:
${memberListContext}

【入力情報】
自由記述メモ（全体）: ${input.freeMemo || "特筆事項なし"}
チーム全体の進捗メモ（詳細）: ${input.progressRough || "特筆事項なし"}
チーム全体の課題・困りごとメモ（詳細）: ${input.issuesRough || "特筆事項なし"}
各メンバーの個別進捗メモ（詳細）:
${memberProgressList || "特筆事項なし"}

【推論要件】
1. 情報の統合と振り分け: 「自由記述メモ」や「各詳細メモ」の内容を総合的に分析してください。特定の個人の作業や成果と判明したものは個人の報告（members[].progress）に振り分け、それ以外の全体概要を「progress」に記載してください。
2. JSONテキストのみを出力すること。

{
  "progress": "チーム全体の概要",
  "issues": "今週の課題",
  "nextWeek": "来週やること",
  "trouble": "今週一番困ってること",
  "members": [ { "id": "...", "name": "...", "progress": "..." } ]
}`;

    const imagePrompt = `# 依頼概要
あなたは専門学校の卒業研究支援AIです。
以下の週報情報をもとに、「他班や教員が一目で理解できる週次進捗ボード」を作成し画像出力してください。
ファイル名: 週報図解_${settings.groupNumber}班${new Date().toISOString().slice(0,10).replace(/-/g,'')}週

テーマ: ${settings.theme}
今週の進捗: ${currentProgress}`;

    return { jsonPrompt, imagePrompt };
  };

  return {
    settings, updateSettings, input, setInput, formattedReport,
    updateFormattedReportField, updateMemberProgress,
    templateState, handleFileUpload, resetTemplate,
    isLoading, jsonInput, setJsonInput, 
    isJsonValid, downloadExcel, generateManualPrompts
  };
};