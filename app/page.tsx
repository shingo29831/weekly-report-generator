// @ai-role: Main dashboard UI with automated JSON validation status and integrated workflow

"use client";

import { useReportApp } from "@/hooks/useReportApp";
import { useState } from "react";
import { Member } from "@/lib/schema";

export default function Home() {
  const {
    settings, updateSettings, input, setInput, uploadedFile, setUploadedFile,
    isLoading, jsonInput, setJsonInput, isJsonValid, generateWithAPI, 
    downloadExcel, generateManualPrompts
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

      <nav className="flex space-x-4 border-b">
        <button onClick={() => setActiveTab("input")} className={`py-2 px-4 ${activeTab === "input" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>報告メモ入力</button>
        <button onClick={() => setActiveTab("ai-collab")} className={`py-2 px-4 ${activeTab === "ai-collab" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>AI連携・生成</button>
        <button onClick={() => setActiveTab("settings")} className={`py-2 px-4 ${activeTab === "settings" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>班・メンバー設定</button>
      </nav>

      {activeTab === "input" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">チーム全体の進捗</label>
              <textarea className="w-full border rounded p-3 text-sm h-40" value={input.progressRough} onChange={(e) => setInput({ ...input, progressRough: e.target.value })} placeholder="今週実施したことを箇条書きで..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">課題・困りごと</label>
              <textarea className="w-full border rounded p-3 text-sm h-40" value={input.issuesRough} onChange={(e) => setInput({ ...input, issuesRough: e.target.value })} placeholder="課題や来週の予定を記入..." />
            </div>
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4 text-gray-800">メンバー個別メモ</h3>
            <div className="grid gap-2">
              {settings.members.map((m) => (
                <div key={m.id} className="flex items-center gap-4 bg-gray-50 p-2 rounded border">
                  <span className="w-32 text-xs font-bold text-gray-600 truncate">{m.name}</span>
                  <input className="flex-1 border rounded p-2 text-sm bg-white" placeholder="個別の担当作業があれば入力..." value={input.memberProgressRough[m.id] || ""} onChange={(e) => setInput({ ...input, memberProgressRough: { ...input.memberProgressRough, [m.id]: e.target.value } })} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "ai-collab" && (
        <section className="space-y-8 animate-in fade-in">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">STEP 1: プロンプトをAIに送る</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-emerald-700 transition-colors">ChatGPT</a>
              <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors">Gemini</a>
              <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-700 transition-colors">Claude</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-bold text-gray-500">テキスト清書用プロンプト</span>
                <textarea readOnly className="w-full border rounded p-2 mt-1 text-xs font-mono bg-white h-32" value={prompts.jsonPrompt} />
                <button onClick={() => { navigator.clipboard.writeText(prompts.jsonPrompt); alert("コピーしました"); }} className="w-full mt-2 bg-gray-800 text-white text-xs py-2 rounded font-bold hover:bg-black transition-colors">コピー</button>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500">週報図解（画像用）プロンプト</span>
                <textarea readOnly className="w-full border rounded p-2 mt-1 text-xs font-mono bg-white h-32" value={prompts.imagePrompt} />
                <button onClick={() => { navigator.clipboard.writeText(prompts.imagePrompt); alert("コピーしました"); }} className="w-full mt-2 bg-gray-800 text-white text-xs py-2 rounded font-bold hover:bg-black transition-colors">コピー</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-lg font-bold">STEP 2: 結果を貼り付けてExcel生成</h3>
              {isJsonValid && (
                <span className="text-sm font-bold text-green-600 flex items-center gap-1 animate-pulse">
                  ✓ 読み込み完了
                </span>
              )}
            </div>
            <textarea
              className={`w-full border-2 rounded p-4 text-sm font-mono h-48 outline-none transition-all ${isJsonValid ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300 focus:border-blue-500'}`}
              placeholder="AIが出力したJSONコードをここに貼り付けると、自動的に内容が検証・適用されます。"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <div className="mt-4">
              <button 
                onClick={downloadExcel} 
                disabled={isLoading}
                className={`w-full font-bold py-4 rounded text-white transition-all shadow-md ${isJsonValid ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                {isLoading ? "生成中..." : "Excelファイルを出力"}
              </button>
              {!isJsonValid && jsonInput.trim() && (
                <p className="text-xs text-red-500 mt-2 text-center">※JSONの形式が正しくありません。AIの出力をそのまま貼り付けてください。</p>
              )}
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
            <div className="flex justify-between mb-4"><h3 className="font-bold text-gray-800">メンバー設定</h3><button onClick={addMember} className="text-xs bg-gray-200 px-3 py-1 rounded font-bold hover:bg-gray-300">＋ メンバー追加</button></div>
            <div className="grid gap-2">
              {settings.members.map((m, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                  <input placeholder="出席番号" className="w-24 border rounded p-2 text-sm bg-white" value={m.id} onChange={(e) => handleMemberChange(i, "id", e.target.value)} />
                  <input placeholder="氏名" className="flex-1 border rounded p-2 text-sm bg-white" value={m.name} onChange={(e) => handleMemberChange(i, "name", e.target.value)} />
                  <button onClick={() => removeMember(i)} className="text-gray-400 hover:text-red-500 px-2 font-bold text-xl">×</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}