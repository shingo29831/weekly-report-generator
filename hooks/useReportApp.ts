// @ai-role: custom hook managing state, real-time validation, and workflow state updates

import { useState, useEffect } from "react";
import { Settings, ReportInput, FormattedReport } from "@/lib/schema";
import { fetchWithRetry } from "@/lib/apiClient";

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

export const useReportApp = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [input, setInput] = useState<ReportInput>({ progressRough: "", issuesRough: "", memberProgressRough: {} });
  const [formattedReport, setFormattedReport] = useState<FormattedReport | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState<string>("");
  const [isJsonValid, setIsJsonValid] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reportSettings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  // JSON入力のリアルタイムバリデーションとデータ適用
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

  // 確認・修正用セクションでの更新ハンドラ
  const updateFormattedReportField = (field: keyof Omit<FormattedReport, "memberProgress">, value: string) => {
    if (formattedReport) {
      setFormattedReport({ ...formattedReport, [field]: value });
    }
  };

  const updateMemberProgress = (id: string, value: string) => {
    if (formattedReport) {
      setFormattedReport({
        ...formattedReport,
        memberProgress: { ...formattedReport.memberProgress, [id]: value }
      });
    }
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
      if (uploadedFile) formData.append("file", uploadedFile);

      const res = await fetch("/api/excel", { method: "POST", body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "生成失敗");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      return true; // 成功
    } catch (error: any) {
      alert(error.message);
      return false; // 失敗
    } finally {
      setIsLoading(false);
    }
  };

  const generateManualPrompts = () => {
    // 編集後のデータがあればそれを優先、なければメモを使用
    const currentProgress = formattedReport?.progress || input.progressRough;
    const memberListContext = settings.members.map(m => `- ${m.name} (出席番号: ${m.id})`).join("\n");
    const memberProgressList = settings.members.map(m => `- ${m.name} (${m.id}): ${input.memberProgressRough[m.id] || "特筆事項なし"}`).join("\n");

    const jsonPrompt = `以下の情報を元に、週報のデータを指定されたJSONフォーマットで出力してください。

【チーム構成とテーマ】
テーマ: ${settings.theme}
テーマ詳細: ${settings.themeDetails}
メンバーリスト:
${memberListContext}

【入力情報】
チーム全体の進捗メモ: ${input.progressRough}
チーム全体の課題・困りごとメモ: ${input.issuesRough}
各メンバーの個別進捗メモ（追加分）:
${memberProgressList}

【推論要件】
1. 進捗の振り分け: 「進捗メモ」を分析し、特定の個人の成果と判明したものは個人の報告に振り分ける。
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
    uploadedFile, setUploadedFile, isLoading, jsonInput, setJsonInput,
    isJsonValid, downloadExcel, generateManualPrompts
  };
};