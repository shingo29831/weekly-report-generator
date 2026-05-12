// @ai-role: Main dashboard UI with JSON import and manual prompt features

"use client";

import { useReportApp } from "@/hooks/useReportApp";
import { useState } from "react";
import { Member } from "@/lib/schema";

export default function Home() {
  const {
    settings,
    updateSettings,
    input,
    setInput,
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
  } = useReportApp();

  const [activeTab, setActiveTab] = useState<"input" | "jsonImport" | "prompts" | "settings">("input");
  const prompts = generateManualPrompts();

  const handleMemberChange = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...settings.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    updateSettings({ ...settings, members: newMembers });
  };

  const addMember = () => {
    updateSettings({
      ...settings,
      members: [...settings.members, { id: "", name: "" }],
    });
  };

  const removeMember = (index: number) => {
    const newMembers = settings.members.filter((_, i) => i !== index);
    updateSettings({ ...settings, members: newMembers });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold border-b pb-2">卒業研究 週報作成支援</h1>

      <section className="bg-blue-50 p-4 rounded-md border border-blue-100">
        <h2 className="text-sm font-bold text-blue-800 mb-2">テンプレートファイル (template.xlsx)</h2>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50"
        />
        <p className="text-xs mt-2 text-blue-600">
          ※ご提示いただいた「卒業研究（2026前期）週報 _●班.xlsx」を選択してください。
        </p>
      </section>

      <div className="flex space-x-4 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab("input")}
          className={`py-2 px-4 whitespace-nowrap ${activeTab === "input" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
        >
          報告内容の入力
        </button>
        <button
          onClick={() => setActiveTab("jsonImport")}
          className={`py-2 px-4 whitespace-nowrap ${activeTab === "jsonImport" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
        >
          JSONから生成
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 px-4 whitespace-nowrap ${activeTab === "settings" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
        >
          班・メンバー設定
        </button>
        <button
          onClick={() => setActiveTab("prompts")}
          className={`py-2 px-4 whitespace-nowrap ${activeTab === "prompts" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
        >
          手動用プロンプト
        </button>
      </div>

      {/* 1. 報告内容入力タブ */}
      {activeTab === "input" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">今週の進捗（チーム全体）</label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={4}
                placeholder="実施した内容を箇条書きなどで入力..."
                value={input.progressRough}
                onChange={(e) => setInput({ ...input, progressRough: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">今週の課題・困りごと</label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={4}
                placeholder="課題、来週の予定、困っていることを入力..."
                value={input.issuesRough}
                onChange={(e) => setInput({ ...input, issuesRough: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-semibold mb-3">各メンバーの個人進捗</h3>
            <div className="space-y-3">
              {settings.members.map((member) => (
                <div key={member.id} className="flex gap-4 items-start">
                  <div className="w-32 pt-2 text-sm font-medium text-gray-600">{member.name}</div>
                  <input
                    type="text"
                    className="flex-1 border rounded p-2 text-sm"
                    placeholder="今週担当した作業内容を入力..."
                    value={input.memberProgressRough[member.id] || ""}
                    onChange={(e) => setInput({
                      ...input,
                      memberProgressRough: { ...input.memberProgressRough, [member.id]: e.target.value }
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              onClick={generateWithAPI}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "AI生成中..." : "API経由でAI清書"}
            </button>
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Excelファイルを出力
            </button>
          </div>
        </section>
      )}

      {/* 2. JSONインポートタブ */}
      {activeTab === "jsonImport" && (
        <section className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md border">
            <h3 className="font-semibold mb-2">1. JSONファイルのアップロード</h3>
            <input
              type="file"
              accept=".json"
              onChange={handleJsonFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. JSONテキストの貼り付け</h3>
            <textarea
              className="w-full border rounded p-2 text-sm font-mono"
              rows={10}
              placeholder='{"progress": "...", "issues": "...", ...}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          <div className="flex space-x-4 pt-2">
            <button
              onClick={handleJsonImport}
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
            >
              JSONデータを読み込む
            </button>
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Excelファイルを出力
            </button>
          </div>
        </section>
      )}

      {/* 3. 環境設定タブ */}
      {activeTab === "settings" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">班番号</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={settings.groupNumber}
                onChange={(e) => updateSettings({ ...settings, groupNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">研究テーマ</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={settings.theme}
                onChange={(e) => updateSettings({ ...settings, theme: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">テーマの詳細</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={settings.themeDetails}
              onChange={(e) => updateSettings({ ...settings, themeDetails: e.target.value })}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold">メンバー構成</h3>
              <button onClick={addMember} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
                + メンバー追加
              </button>
            </div>
            {settings.members.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  placeholder="出席番号"
                  className="w-24 border rounded p-2 text-sm"
                  value={m.id}
                  onChange={(e) => handleMemberChange(i, "id", e.target.value)}
                />
                <input
                  placeholder="氏名"
                  className="flex-1 border rounded p-2 text-sm"
                  value={m.name}
                  onChange={(e) => handleMemberChange(i, "name", e.target.value)}
                />
                <button onClick={() => removeMember(i)} className="text-red-500 px-2">削除</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. プロンプトタブ */}
      {activeTab === "prompts" && (
        <section className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg">テキスト生成用プロンプト (JSON出力用)</h3>
            <textarea readOnly className="w-full border rounded p-2 bg-gray-50 text-sm font-mono" rows={15} value={prompts.jsonPrompt} />
            <button
              onClick={() => navigator.clipboard.writeText(prompts.jsonPrompt)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              コピー
            </button>
          </div>
          <div>
            <h3 className="font-semibold text-lg">画像生成用（週報図解）プロンプト</h3>
            <textarea readOnly className="w-full border rounded p-2 bg-gray-50 text-sm font-mono" rows={8} value={prompts.imagePrompt} />
            <button
              onClick={() => navigator.clipboard.writeText(prompts.imagePrompt)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              コピー
            </button>
          </div>
        </section>
      )}
    </div>
  );
}