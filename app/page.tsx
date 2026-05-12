// @ai-role: Main dashboard UI with integrated AI workflow and external links

"use client";

import { useReportApp } from "@/hooks/useReportApp";
import { useState } from "react";
import { Member } from "@/lib/schema";

export default function Home() {
  const {
    settings, updateSettings, input, setInput, uploadedFile, setUploadedFile,
    isLoading, jsonInput, setJsonInput, generateWithAPI, downloadExcel,
    generateManualPrompts, handleJsonImport
  } = useReportApp();

  const [activeTab, setActiveTab] = useState<"input" | "ai-collab" | "settings">("input");
  const prompts = generateManualPrompts();

  const handleMemberChange = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...settings.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    updateSettings({ ...settings, members: newMembers });
  };

  const addMember = () => {
    updateSettings({ ...settings, members: [...settings.members, { id: "", name: "" }] });
  };

  const removeMember = (index: number) => {
    updateSettings({ ...settings, members: settings.members.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">週報作成支援アプリ</h1>
        <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded">
          {settings.groupNumber}班：{settings.theme}
        </div>
      </header>

      <section className="bg-blue-50 p-4 rounded-md border border-blue-100">
        <h2 className="text-sm font-bold text-blue-800 mb-2">1. テンプレートファイルを選択</h2>
        <input
          type="file" accept=".xlsx"
          onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50"
        />
      </section>

      <div className="flex space-x-4 border-b">
        <button onClick={() => setActiveTab("input")} className={`py-2 px-4 ${activeTab === "input" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>報告メモ入力</button>
        <button onClick={() => setActiveTab("ai-collab")} className={`py-2 px-4 ${activeTab === "ai-collab" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>AI連携・生成</button>
        <button onClick={() => setActiveTab("settings")} className={`py-2 px-4 ${activeTab === "settings" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>班・メンバー設定</button>
      </div>

      {activeTab === "input" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">チーム全体の進捗</label>
              <textarea className="w-full border rounded p-3 text-sm" rows={5} value={input.progressRough} onChange={(e) => setInput({ ...input, progressRough: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">課題・困りごと</label>
              <textarea className="w-full border rounded p-3 text-sm" rows={5} value={input.issuesRough} onChange={(e) => setInput({ ...input, issuesRough: e.target.value })} />
            </div>
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">メンバー個別メモ（必要な場合のみ）</h3>
            {settings.members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 mb-2">
                <span className="w-32 text-sm font-medium">{m.name}</span>
                <input className="flex-1 border rounded p-2 text-sm" value={input.memberProgressRough[m.id] || ""} onChange={(e) => setInput({ ...input, memberProgressRough: { ...input.memberProgressRough, [m.id]: e.target.value } })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "ai-collab" && (
        <section className="space-y-8">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">STEP 1: プロンプトをコピーしてAIに送る</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <a href="https://chatgpt.com/" target="_blank" className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-emerald-700">ChatGPT</a>
              <a href="https://gemini.google.com/" target="_blank" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Gemini</a>
              <a href="https://claude.ai/" target="_blank" className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-700">Claude</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">テキスト生成用</span>
                <textarea readOnly className="w-full border rounded p-2 mt-1 text-xs font-mono bg-white h-32" value={prompts.jsonPrompt} />
                <button onClick={() => { navigator.clipboard.writeText(prompts.jsonPrompt); alert("コピーしました"); }} className="w-full mt-2 bg-gray-800 text-white text-xs py-2 rounded font-bold">コピー</button>
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">画像生成用</span>
                <textarea readOnly className="w-full border rounded p-2 mt-1 text-xs font-mono bg-white h-32" value={prompts.imagePrompt} />
                <button onClick={() => { navigator.clipboard.writeText(prompts.imagePrompt); alert("コピーしました"); }} className="w-full mt-2 bg-gray-800 text-white text-xs py-2 rounded font-bold">コピー</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-bold mb-4">STEP 2: AIの結果を貼り付けて生成</h3>
            <textarea
              className="w-full border-2 border-dashed rounded p-4 text-sm font-mono h-48 focus:border-blue-500 outline-none"
              placeholder="AIが出力したJSONをここに貼り付け..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <div className="flex gap-4 mt-4">
              <button onClick={handleJsonImport} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700">JSONを読み込む</button>
              <button onClick={downloadExcel} className="flex-1 bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700">Excelファイルを出力</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-bold">班番号</label><input className="w-full border rounded p-2 mt-1" value={settings.groupNumber} onChange={(e) => updateSettings({ ...settings, groupNumber: e.target.value })} /></div>
            <div><label className="text-sm font-bold">テーマ</label><input className="w-full border rounded p-2 mt-1" value={settings.theme} onChange={(e) => updateSettings({ ...settings, theme: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-bold">詳細</label><textarea className="w-full border rounded p-2 mt-1" rows={3} value={settings.themeDetails} onChange={(e) => updateSettings({ ...settings, themeDetails: e.target.value })} /></div>
          <div className="border-t pt-4">
            <div className="flex justify-between mb-4"><h3 className="font-bold">メンバー設定</h3><button onClick={addMember} className="text-xs bg-gray-200 px-3 py-1 rounded font-bold">追加</button></div>
            {settings.members.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="番号" className="w-20 border rounded p-2 text-sm" value={m.id} onChange={(e) => handleMemberChange(i, "id", e.target.value)} />
                <input placeholder="名前" className="flex-1 border rounded p-2 text-sm" value={m.name} onChange={(e) => handleMemberChange(i, "name", e.target.value)} />
                <button onClick={() => removeMember(i)} className="text-red-500 px-2 font-bold">×</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}