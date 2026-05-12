// @ai-role: custom hook managing state, local storage, and business flows for the UI

import { useState, useEffect } from "react";
import { Settings, ReportInput, FormattedReport } from "@/lib/schema";
import { fetchWithRetry } from "@/lib/apiClient";

const DEFAULT_SETTINGS: Settings = {
  groupNumber: "1",
  theme: "UIの形状とユーザークリック率の関係性、またはAIベースのRPAマクロ生成",
  themeDetails: "UI形状の変化がユーザーのクリック行動に与える統計的影響の調査、およびAIを活用した業務自動化マクロの効率的な生成手法の提案を行う。",
  members: [
    { id: "2201001", name: "梅田 慎悟" },
  ],
};

export const useReportApp = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [input, setInput] = useState<ReportInput>({ progressRough: "", issuesRough: "", memberProgressRough: {} });
  const [formattedReport, setFormattedReport] = useState<FormattedReport | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState<string>("");

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
      alert("AI推論が完了しました。");
    } catch (error) {
      alert("AI推論に失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = async () => {
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
        throw new Error(errorData.error || "ファイルの生成に失敗しました。");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `卒業研究（2026前期）週報_${settings.groupNumber}班.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateManualPrompts = () => {
    const currentProgress = formattedReport?.progress || input.progressRough;
    
    // メンバーリストの構築
    const memberListContext = settings.members
      .map(m => `- ${m.name} (出席番号: ${m.id})`)
      .join("\n");

    // メンバーの追加進捗メモ
    const memberProgressList = settings.members
      .map(m => `- ${m.name} (${m.id}): ${input.memberProgressRough[m.id] || "特筆事項なし"}`)
      .join("\n");

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

【推論と出力の要件】
1. 進捗の振り分け: 「チーム全体の進捗メモ」の内容を分析し、特定の個人（メンバー）が関わった作業や成果と判明したものは、その詳細な内容を該当する個人の進捗報告（members[].progress）に振り分けて詳しく記載してください。
2. チーム全体の進捗: 個人の詳細を移した上で、チーム全体としての進捗概要（大まかな進捗）を「progress」に記載してください。
3. 課題の整理: 「課題・困りごとメモ」から、「今週の課題」「来週やること」「今週の一番困っていること」を抽出し、それぞれ該当するキーに清書してください。
4. 以下のJSONフォーマットの構造に厳密に従い、JSONテキストのみを出力してください。Markdownのコードブロック記法(\`\`\`)は使用しないでください。

{
  "progress": "チーム全体としての今週の大まかな進捗",
  "issues": "今週の課題（何ができなかったか・今後何をやらないといけないか）",
  "nextWeek": "来週やること",
  "trouble": "今週の一番困ってること",
  "members": [
    {
      "id": "メンバーの出席番号",
      "name": "メンバーの氏名",
      "progress": "個人の成果や担当した詳細な作業内容"
    }
  ]
}`;

    const imagePrompt = `# 依頼概要
あなたは専門学校の卒業研究支援AIです。
以下の週報情報をもとに、「他班や教員が一目で理解できる週次進捗ボード」を作成してください。
ファイル名: 週報図解_${settings.groupNumber}班${new Date().toISOString().slice(0,10).replace(/-/g,'')}週

テーマ: ${settings.theme}
今週の進捗: ${currentProgress}`;

    return { jsonPrompt, imagePrompt };
  };

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      const parsedMemberProgress: Record<string, string> = {};
      if (Array.isArray(parsed.members)) {
        parsed.members.forEach((m: any) => {
          parsedMemberProgress[m.id] = m.progress;
        });
      }

      const report: FormattedReport = {
        progress: parsed.progress || "",
        issues: parsed.issues || "",
        nextWeek: parsed.nextWeek || "",
        trouble: parsed.trouble || "",
        memberProgress: parsedMemberProgress,
      };

      setFormattedReport(report);
      alert("JSONデータを正常に読み込みました。「Excelファイルを出力」ボタンから出力できます。");
    } catch (error) {
      alert("JSONのパースに失敗しました。形式が正しいか確認してください。");
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
    e.target.value = '';
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
    jsonInput,
    setJsonInput,
    generateWithAPI,
    downloadExcel,
    generateManualPrompts,
    handleJsonImport,
    handleJsonFileUpload,
  };
};