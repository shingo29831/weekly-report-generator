// @ai-role: Main dashboard UI implementing dynamic template persistence display and workflow

"use client";

import { useReportApp } from "@/hooks/useReportApp";
import { useState } from "react";
import { Member } from "@/lib/schema";

type FlowStep = "input" | "external-text" | "external-image" | "settings";

export default function Home() {
  const {
    settings, updateSettings, input, setInput, formattedReport,
    updateFormattedReportField, updateMemberProgress,
    templateState, handleFileUpload, resetTemplate,
    isLoading, jsonInput, setJsonInput, 
    isJsonValid, downloadExcel, generateManualPrompts
  } = useReportApp();

  const [currentStep, setCurrentStep] = useState<FlowStep>("input");
  const prompts = generateManualPrompts();

  const handleMemberChange = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...settings.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    updateSettings({ ...settings, members: newMembers });
  };
  const addMember = () => updateSettings({ ...settings, members: [...settings.members, { id: "", name: "" }] });
  const removeMember = (index: number) => updateSettings({ ...settings, members: settings.members.filter((_, i) => i !== index) });

  const handleInternalGenerate = () => alert("「サイト内で生成」機能は現在準備中です。今後のアップデートをお待ちください。");
  const handleExternalTextGenerate = () => setCurrentStep("external-text");

  const handleDownloadExcelAndNext = async () => {
    const success = await downloadExcel();
    if (success) setCurrentStep("external-image");
  };

  const ExternalAILinks = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-emerald-700 transition-colors">ChatGPTを開く</a>
      <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors">Geminiを開く</a>
      <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-700 transition-colors">Claudeを開く</a>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">週報作成支援アプリ</h1>
        <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded border">
          {settings.groupNumber}班：{settings.theme}
        </div>
      </header>

      {/* --- 適用中のテンプレート表示セクション --- */}
      <section className="bg-blue-50 p-4 rounded-md border border-blue-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-blue-900">更新対象ファイル</h2>
          {templateState.source !== "generated" && (
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-200 text-blue-900">
              {templateState.source === "default" && "初期テンプレート"}
              {templateState.source === "uploaded" && "手動アップロード"}
            </span>
          )}
        </div>
        
        <div className="bg-white p-3 rounded border border-blue-200 flex items-center justify-between mb-4 shadow-sm">
          <div>
            <p className="font-bold text-gray-800 text-sm">{templateState.name}</p>
            {templateState.timestamp && (
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500">出力日時: {templateState.timestamp}</p>
                {templateState.source === "generated" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    前回出力したファイル
                  </span>
                )}
              </div>
            )}
          </div>
          {templateState.source !== "default" && (
            <button onClick={resetTemplate} className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors">
              初期状態に戻す
            </button>
          )}
        </div>

        <label className="text-xs font-bold text-gray-600 mb-1 block">別のファイルで上書きする</label>
        <input
          type="file" accept=".xlsx"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
        />
      </section>

      <nav className="flex space-x-4 border-b">
        <button onClick={() => setCurrentStep("input")} className={`py-2 px-4 ${currentStep === "input" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>報告メモ入力</button>
        <button onClick={() => setCurrentStep("settings")} className={`py-2 px-4 ${currentStep === "settings" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>班・メンバー設定</button>
      </nav>

      {/* STEP 1 */}
      {currentStep === "input" && (
        <section className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">今週の進捗（メモ書き）</label>
              <textarea className="w-full border rounded p-3 text-sm h-40" value={input.progressRough} onChange={(e) => setInput({ ...input, progressRough: e.target.value })} placeholder="個人からチームまで実施したことを適当に記入..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">課題・困りごと（メモ書き）</label>
              <textarea className="w-full border rounded p-3 text-sm h-40" value={input.issuesRough} onChange={(e) => setInput({ ...input, issuesRough: e.target.value })} placeholder="課題や来週の予定を記入..." />
            </div>
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4 text-gray-800">メンバー個別メモ（必要な場合のみ）</h3>
            <div className="grid gap-2">
              {settings.members.map((m) => (
                <div key={m.id} className="flex items-center gap-4 bg-gray-50 p-2 rounded border">
                  <span className="w-32 text-xs font-bold text-gray-600 truncate">{m.name}</span>
                  <input className="flex-1 border rounded p-2 text-sm bg-white" placeholder="個別の担当作業があれば入力..." value={input.memberProgressRough[m.id] || ""} onChange={(e) => setInput({ ...input, memberProgressRough: { ...input.memberProgressRough, [m.id]: e.target.value } })} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={handleInternalGenerate} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded hover:bg-gray-900 transition-colors">
              サイト内で生成（準備中）
            </button>
            <button onClick={handleExternalTextGenerate} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700 transition-colors shadow-md">
              外部AIを使用して生成する
            </button>
          </div>
        </section>
      )}

      {/* STEP 2 */}
      {currentStep === "external-text" && (
        <section className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">STEP 1: プロンプトをコピーしてAIに入力する</h3>
            <ExternalAILinks />
            <textarea readOnly className="w-full border rounded p-2 mt-2 text-xs font-mono bg-white h-32" value={prompts.jsonPrompt} />
            <button onClick={() => { navigator.clipboard.writeText(prompts.jsonPrompt); alert("プロンプトをコピーしました"); }} className="w-full mt-2 bg-gray-800 text-white text-sm py-2 rounded font-bold hover:bg-black transition-colors">プロンプトをコピー</button>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-lg font-bold">STEP 2: AIの結果を貼り付ける</h3>
              {isJsonValid && <span className="text-sm font-bold text-green-600">✓ 読み込み成功</span>}
            </div>
            <textarea
              className={`w-full border-2 rounded p-4 text-sm font-mono h-40 outline-none transition-all ${isJsonValid ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300 focus:border-blue-500'}`}
              placeholder="AIが出力したJSONコードをここに貼り付けてください..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          {isJsonValid && formattedReport && (
            <div className="bg-white p-6 rounded-lg border-2 border-indigo-100 shadow-md animate-in fade-in">
              <h3 className="text-lg font-bold mb-4 text-indigo-900 border-b pb-2">STEP 3: 内容の確認と修正</h3>
              <p className="text-sm text-gray-600 mb-4">セルに書き込まれる内容です。必要に応じてこの場で直接修正できます。</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">チーム全体としての今週の進捗</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={3} value={formattedReport.progress} onChange={(e) => updateFormattedReportField("progress", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">今週の課題</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={2} value={formattedReport.issues} onChange={(e) => updateFormattedReportField("issues", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">来週やること</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={2} value={formattedReport.nextWeek} onChange={(e) => updateFormattedReportField("nextWeek", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">今週の一番困ってること</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={2} value={formattedReport.trouble} onChange={(e) => updateFormattedReportField("trouble", e.target.value)} />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-bold mb-3">各メンバーの進捗</h4>
                  <div className="grid gap-3">
                    {settings.members.map((m) => (
                      <div key={m.id}>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{m.name}</label>
                        <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={2} value={formattedReport.memberProgress[m.id] || ""} onChange={(e) => updateMemberProgress(m.id, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleDownloadExcelAndNext} 
                  disabled={isLoading}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 font-bold py-4 rounded text-white shadow-lg transition-all text-lg"
                >
                  {isLoading ? "Excelファイル出力中..." : "修正内容を適用してExcelを出力し、次へ"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 3 */}
      {currentStep === "external-image" && (
        <section className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-green-50 p-4 rounded border border-green-200 text-green-800 font-bold flex items-center gap-2">
            <span>✓ Excelファイルの出力と、テンプレートの自動保存が完了しました。</span>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">STEP 4: 週報図解（画像）の作成</h3>
            <p className="text-sm text-gray-600 mb-4">
              出力された内容をもとに、画像を生成するためのプロンプトです。AIサイトで画像を生成し、保存してください。
            </p>
            <ExternalAILinks />
            
            <textarea readOnly className="w-full border rounded p-2 mt-4 text-sm font-mono bg-white h-40" value={prompts.imagePrompt} />
            <button onClick={() => { navigator.clipboard.writeText(prompts.imagePrompt); alert("画像生成用プロンプトをコピーしました"); }} className="w-full mt-2 bg-gray-800 text-white text-sm py-3 rounded font-bold hover:bg-black transition-colors">
              画像生成用プロンプトをコピー
            </button>
          </div>

          <button onClick={() => setCurrentStep("input")} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300">
            最初に戻る
          </button>
        </section>
      )}

      {/* 環境設定タブ */}
      {currentStep === "settings" && (
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