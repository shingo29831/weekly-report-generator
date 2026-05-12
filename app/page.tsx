// @ai-role: Main dashboard UI, separating view from the business logic layer

"use client";

import { useReportApp } from "@/hooks/useReportApp";
import { useState } from "react";

export default function Home() {
  const {
    settings,
    input,
    setInput,
    uploadedFile,
    setUploadedFile,
    isLoading,
    generateWithAPI,
    downloadExcel,
    generateManualPrompts,
  } = useReportApp();

  const [activeTab, setActiveTab] = useState<"input" | "prompts">("input");
  const prompts = generateManualPrompts();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold border-b pb-2">週報ジェネレーター</h1>

      <section className="bg-gray-50 p-4 rounded-md shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">ベースExcelファイル（任意）</h2>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploadedFile && <p className="text-sm mt-2 text-green-600">ファイル読込済: {uploadedFile.name}</p>}
      </section>

      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab("input")}
          className={`py-2 px-4 ${activeTab === "input" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
        >
          内容入力・API自動作成
        </button>
        <button
          onClick={() => setActiveTab("prompts")}
          className={`py-2 px-4 ${activeTab === "prompts" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
        >
          手動用プロンプト作成
        </button>
      </div>

      {activeTab === "input" && (
        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">今週の進捗（メモ書き）</label>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={input.progressRough}
              onChange={(e) => setInput({ ...input, progressRough: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">今週の課題（メモ書き）</label>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={input.issuesRough}
              onChange={(e) => setInput({ ...input, issuesRough: e.target.value })}
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={generateWithAPI}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "生成中..." : "AIで自動整形する"}
            </button>
            <button
              onClick={downloadExcel}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Excelを出力
            </button>
          </div>
        </section>
      )}

      {activeTab === "prompts" && (
        <section className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg">テキスト生成用プロンプト</h3>
            <textarea readOnly className="w-full border rounded p-2 bg-gray-50" rows={6} value={prompts.jsonPrompt} />
            <button
              onClick={() => navigator.clipboard.writeText(prompts.jsonPrompt)}
              className="mt-2 text-sm text-blue-600"
            >
              コピー
            </button>
          </div>
          <div>
            <h3 className="font-semibold text-lg">画像生成用（週報図解）プロンプト</h3>
            <textarea readOnly className="w-full border rounded p-2 bg-gray-50" rows={8} value={prompts.imagePrompt} />
            <button
              onClick={() => navigator.clipboard.writeText(prompts.imagePrompt)}
              className="mt-2 text-sm text-blue-600"
            >
              コピー
            </button>
          </div>
        </section>
      )}
    </div>
  );
}