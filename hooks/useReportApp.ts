// @ai-role: custom hook managing state, local storage, and business flows for the UI

import { useState, useEffect } from "react";
import { Settings, ReportInput, FormattedReport } from "@/lib/schema";
import { fetchWithRetry } from "@/lib/apiClient";

const DEFAULT_SETTINGS: Settings = {
  groupNumber: "1",
  theme: "UI形状とユーザークリック率の関係性、またはAIベースのRPAマクロ生成",
  themeDetails: "UIデザインの違いがユーザーの操作に与える影響の統計的分析、およびAIを用いた業務自動化の効率化について検証する。",
  members: [{ id: "001", name: "メンバー1" }],
};

export const useReportApp = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [input, setInput] = useState<ReportInput>({ progressRough: "", issuesRough: "", memberProgressRough: {} });
  const [formattedReport, setFormattedReport] = useState<FormattedReport | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reportSettings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("reportSettings", JSON.stringify(newSettings));
  };

  const generateWithAPI = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithRetry("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, settings }),
      });
      const data = await res.json();
      setFormattedReport(data.result);
    } catch (error) {
      alert("AI推論に失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!formattedReport) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("settings", JSON.stringify(settings));
      formData.append("report", JSON.stringify(formattedReport));
      if (uploadedFile) formData.append("file", uploadedFile);

      const res = await fetchWithRetry("/api/excel", { method: "POST", body: formData });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("ファイルの生成に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const generateManualPrompts = () => {
    const jsonPrompt = `
以下の情報を元に、週報の指定JSONフォーマットを出力してください。
テーマ: ${settings.theme}
進捗メモ: ${input.progressRough}
課題メモ: ${input.issuesRough}
    `;

    // To prevent undefined errors, fallback to empty strings if progress/issues aren't formatted yet
    const currentProgress = formattedReport?.progress || input.progressRough;
    
    const imagePrompt = `
# 依頼概要
あなたは専門学校の卒業研究支援AIです。
以下の週報情報をもとに、「他班や教員が一目で理解できる週次進捗ボード」を作成してください。
ファイル名: 週報図解_${settings.groupNumber}班${new Date().toISOString().slice(0,10).replace(/-/g,'')}週

テーマ: ${settings.theme}
今週の進捗: ${currentProgress}
    `;
    return { jsonPrompt, imagePrompt };
  };

  return {
    settings,
    updateSettings,
    input,
    setInput,
    formattedReport,
    uploadedFile,
    setUploadedFile,
    isLoading,
    generateWithAPI,
    downloadExcel,
    generateManualPrompts,
  };
};