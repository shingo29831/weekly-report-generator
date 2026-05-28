// @ai-role: Main dashboard UI implementing dynamic template persistence display and workflow with low-barrier free memo input

"use client";

import { useReportApp } from "@/hooks/useReportApp";
import { useState } from "react";
import { Member, Task } from "@/lib/schema";

type FlowStep = "input" | "external-text" | "external-image" | "settings";

export default function Home() {
  const {
    settings, updateSettings, input, setInput, formattedReport,
    updateFormattedReportField, updateMemberProgress, updateMemberRole,
    updateReportTask, addReportTask, removeReportTask,
    templateState, handleFileUpload, handleImageUpload, reportImage, resetTemplate,
    isLoading, jsonInput, setJsonInput, 
    isJsonValid, downloadExcel, generateManualPrompts,
    importSettingsFromExcel,
    startDate, setStartDate, endDate, setEndDate
  } = useReportApp();

  const [currentStep, setCurrentStep] = useState<FlowStep>("input");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const prompts = generateManualPrompts();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleImport = async () => {
    const success = await importSettingsFromExcel();
    if (success) {
      setCopiedStates((prev) => ({ ...prev, "import": true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, "import": false }));
      }, 2000);
    }
  };

  const handleMemberChange = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...settings.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    updateSettings({ ...settings, members: newMembers });
  };
  const addMember = () => updateSettings({ ...settings, members: [...settings.members, { id: "", name: "" }] });
  const removeMember = (index: number) => updateSettings({ ...settings, members: settings.members.filter((_, i) => i !== index) });

  const handleSettingTaskChange = (index: number, field: keyof Task, value: any) => {
    const newTasks = [...settings.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    
    if (field === "progress" && value < 100) {
      newTasks[index].isCompleted = false;
    }
    
    updateSettings({ ...settings, tasks: newTasks });
  };
  const addSettingTask = () => {
    updateSettings({ ...settings, tasks: [...settings.tasks, { id: `task-${Date.now()}`, name: "新規タスク", progress: 0, isCompleted: false }] });
  };
  const removeSettingTask = (index: number) => {
    updateSettings({ ...settings, tasks: settings.tasks.filter((_, i) => i !== index) });
  };

  const handleInsertTaskToMemberProgress = (memberId: string, task: Task) => {
    const el = document.getElementById(`member-progress-${memberId}`) as HTMLTextAreaElement;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = formattedReport?.memberProgress[memberId] || "";
      const insertText = `【${task.name}: ${task.progress}%】`;
      const newText = text.substring(0, start) + insertText + text.substring(end);
      updateMemberProgress(memberId, newText);
      
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + insertText.length, start + insertText.length);
      }, 0);
    }
  };

  const handleInternalGenerate = () => alert("「サイト内で生成」機能は現在準備中です。今後のアップデートをお待ちください。");
  const handleExternalTextGenerate = () => setCurrentStep("external-text");

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
          <h2 className="text-sm font-bold text-blue-900">更新対象ファイル ※前回の提出ファイルを入れてください。履歴がある場合は自動適用されます。</h2>
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

      {/* --- 対象期間設定セクション（カレンダーUI） --- */}
      <section className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-800">📅 週報の対象期間設定</h2>
        <p className="text-xs text-gray-500">
          学校の休みなどで週初めや週終わりが変動する場合は、カレンダーから日付を変更してください。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">週初め</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full border rounded p-2 text-sm bg-white focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">週終わり</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full border rounded p-2 text-sm bg-white focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      <nav className="flex space-x-4 border-b">
        <button onClick={() => setCurrentStep("input")} className={`py-2 px-4 ${currentStep === "input" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>報告メモ入力</button>
        <button onClick={() => setCurrentStep("settings")} className={`py-2 px-4 ${currentStep === "settings" ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}>班・メンバー・タスク設定</button>
      </nav>

      {/* STEP 1: メモ入力 */}
      {currentStep === "input" && (
        <section className="space-y-6 animate-in fade-in">
          
          <div className="bg-white p-5 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-base font-bold text-indigo-900">
                📝 今週の活動メモ（何でも自由に記述）
              </label>
              {prompts.pastReportsContext && (
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                  ✓ 過去の週報データを参照中
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              誰が何をやったか、困ったことなど、思いつくままに箇条書きで適当に書いてください。<br/>
              （例: 〇〇さんがUI設計した。API連携でエラーが出て困っている。来週はDB構築する等）
            </p>
            <textarea 
              className="w-full border-2 rounded p-3 text-sm h-64 focus:border-indigo-500 outline-none transition-colors bg-gray-50 focus:bg-white" 
              value={input.freeMemo || ""} 
              onChange={(e) => setInput({ ...input, freeMemo: e.target.value })} 
              placeholder="ここに全てを書き込んでください。" 
            />
          </div>

          <details className="group bg-gray-50 p-4 rounded border cursor-pointer">
            <summary className="font-bold text-sm text-gray-700 list-none flex justify-between items-center">
              <span>さらに詳細に分けて入力する（任意・必要な場合のみ）</span>
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <div className="pt-6 mt-4 border-t border-gray-200 cursor-default space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">進捗・差分</label>
                  <textarea className="w-full border rounded p-3 text-sm h-40" placeholder="完了・進行中・未着手など" value={input.progressRough} onChange={(e) => setInput({ ...input, progressRough: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">問題・リスク</label>
                  <textarea className="w-full border rounded p-3 text-sm h-40" placeholder="発生した問題・影響範囲など" value={input.issuesRough} onChange={(e) => setInput({ ...input, issuesRough: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">来週やること</label>
                  <textarea className="w-full border rounded p-3 text-sm h-40" placeholder="次の具体的なアクション" value={input.nextWeekRough || ""} onChange={(e) => setInput({ ...input, nextWeekRough: e.target.value })} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-gray-800 text-sm">メンバー個別メモ</h3>
                <div className="grid gap-2">
                  {settings.members.map((m) => (
                    <div key={m.id} className="flex items-start gap-4 bg-white p-2 rounded border">
                      <span className="w-24 text-xs font-bold text-gray-600 truncate mt-2">{m.name}</span>
                      <input className="w-32 border rounded p-2 text-xs bg-white mt-1" placeholder="今週の担当" value={input.memberRolesRough?.[m.id] || ""} onChange={(e) => setInput({ ...input, memberRolesRough: { ...input.memberRolesRough, [m.id]: e.target.value } })} />
                      <textarea className="flex-1 border rounded p-2 text-xs bg-white h-24" placeholder="進捗（完了/進行中）・差分・問題・次やること等..." value={input.memberProgressRough[m.id] || ""} onChange={(e) => setInput({ ...input, memberProgressRough: { ...input.memberProgressRough, [m.id]: e.target.value } })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>

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

      {/* STEP 2: AIテキスト確認・編集 */}
      {currentStep === "external-text" && (
        <section className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">STEP 1: プロンプトをコピーしてAIに入力する</h3>
            <ExternalAILinks />
            <textarea readOnly className="w-full border rounded p-2 mt-2 text-xs font-mono bg-white h-32" value={prompts.jsonPrompt} />
            <button 
              onClick={() => handleCopy(prompts.jsonPrompt, "jsonPrompt")} 
              className="w-full mt-2 bg-gray-800 text-white text-sm py-2 rounded font-bold hover:bg-black transition-colors"
            >
              {copiedStates["jsonPrompt"] ? "コピーしました" : "プロンプトをコピー"}
            </button>
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
                {/* タスク管理セクション */}
                <div className="bg-indigo-50 p-4 rounded border border-indigo-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-indigo-900">📌 タスクの更新・新規追加</h4>
                    <button onClick={addReportTask} className="text-xs bg-white text-indigo-700 px-3 py-1 rounded font-bold hover:bg-indigo-100 border border-indigo-200">＋ タスク追加</button>
                  </div>
                  <div className="space-y-3">
                    {formattedReport.updatedTasks?.map((task, i) => (
                      <div key={task.id} className="flex flex-col gap-2 bg-white p-3 rounded border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${task.isCompleted ? 'bg-gray-100 text-gray-500' : 'bg-indigo-100 text-indigo-700'}`}>
                            {task.isCompleted ? '完了' : '進行中'}
                          </span>
                          <input className={`flex-1 border-0 border-b border-gray-200 p-1 text-sm bg-transparent focus:ring-0 focus:border-indigo-500 ${task.isCompleted ? 'line-through text-gray-400' : 'font-bold'}`} value={task.name} onChange={(e) => updateReportTask(i, 'name', e.target.value)} placeholder="タスク名" />
                          <button onClick={() => removeReportTask(i)} className="text-gray-400 hover:text-red-500 px-2 font-bold">×</button>
                        </div>
                        <div className="flex items-center gap-3 pl-6">
                          <span className="text-xs font-bold text-gray-600">進捗度:</span>
                          <input type="range" min="0" max="100" value={task.progress} onChange={(e) => updateReportTask(i, 'progress', Number(e.target.value))} className="flex-1 accent-indigo-600" />
                          <input type="number" min="0" max="100" value={task.progress} onChange={(e) => updateReportTask(i, 'progress', Number(e.target.value))} className="w-16 border rounded p-1 text-sm text-right bg-gray-50 focus:bg-white" />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                      </div>
                    ))}
                    {(!formattedReport.updatedTasks || formattedReport.updatedTasks.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-2">タスクはありません。</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 mt-4">チーム全体としての今週の進捗（差分）</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={5} value={formattedReport.progress} onChange={(e) => updateFormattedReportField("progress", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">今週の課題（問題・リスク）</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={4} value={formattedReport.issues} onChange={(e) => updateFormattedReportField("issues", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">来週やること（次のアクション）</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={4} value={formattedReport.nextWeek} onChange={(e) => updateFormattedReportField("nextWeek", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">今週の一番困ってること</label>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={4} value={formattedReport.trouble} onChange={(e) => updateFormattedReportField("trouble", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">プロジェクトの詳細設定（自動更新案）</label>
                  <p className="text-xs text-gray-500 mb-1">次回以降のAI推論時のベース情報として使われます。Excel出力時に設定へ反映されます。</p>
                  <textarea className="w-full border rounded p-2 text-sm bg-indigo-50/30" rows={6} value={formattedReport.updatedThemeDetails || ""} onChange={(e) => updateFormattedReportField("updatedThemeDetails", e.target.value)} />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-bold mb-3">各メンバーの進捗</h4>
                  <div className="grid gap-4">
                    {settings.members.map((m) => (
                      <div key={m.id} className="bg-indigo-50/20 p-3 rounded border">
                        <label className="block text-sm font-bold text-gray-800 mb-2">{m.name}</label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-20">今週の担当:</span>
                            <input className="flex-1 border rounded p-2 text-sm bg-white" value={formattedReport.memberRoles?.[m.id] || ""} onChange={(e) => updateMemberRole(m.id, e.target.value)} placeholder={`デフォルト: ${m.role || "なし"}`} />
                          </div>
                          <div className="flex items-start gap-2 flex-col">
                            <div className="flex items-center w-full">
                              <span className="text-xs text-gray-500 w-20 pt-2">進捗内容:</span>
                              {formattedReport.updatedTasks && formattedReport.updatedTasks.filter(t => !t.isCompleted).length > 0 && (
                                <div className="flex flex-wrap gap-1 ml-auto">
                                  <span className="text-[10px] text-gray-500 self-center mr-1">タスク挿入:</span>
                                  {formattedReport.updatedTasks.filter(t => !t.isCompleted).map(task => (
                                    <button 
                                      key={task.id} 
                                      onClick={() => handleInsertTaskToMemberProgress(m.id, task)}
                                      className="text-[10px] bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 truncate max-w-[120px]"
                                      title={task.name}
                                    >
                                      {task.name} ({task.progress}%)
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <textarea 
                              id={`member-progress-${m.id}`}
                              className="w-full border rounded p-2 text-sm bg-white" 
                              rows={6} 
                              value={formattedReport.memberProgress[m.id] || ""} 
                              onChange={(e) => updateMemberProgress(m.id, e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentStep("external-image")} 
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 font-bold py-4 rounded text-white shadow-lg transition-all text-lg"
                >
                  修正内容を確定して画像生成・出力ページへ
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 3: 画像生成・画像アップロード・Excel最終出力 */}
      {currentStep === "external-image" && (
        <section className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">STEP 4: 週報図解（画像）の作成</h3>
            <p className="text-sm text-gray-600 mb-4">
              出力された内容をもとに、画像を生成するためのプロンプトです。AIサイトで画像を生成し、保存してください。
            </p>
            <ExternalAILinks />

            <div className="mt-4 p-3 bg-white border border-gray-200 rounded shadow-sm flex justify-between items-center">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">画像保存時の推奨ファイル名</label>
                <code className="text-sm font-mono text-indigo-900 bg-indigo-50 px-2 py-1 rounded">{prompts.imageFileName}</code>
              </div>
              <button 
                onClick={() => handleCopy(prompts.imageFileName, "imageFileName")} 
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1.5 px-3 rounded transition-colors"
              >
                {copiedStates["imageFileName"] ? "コピーしました" : "コピー"}
              </button>
            </div>
            
            <textarea readOnly className="w-full border rounded p-2 mt-4 text-sm font-mono bg-white h-40" value={prompts.imagePrompt} />
            <button 
              onClick={() => handleCopy(prompts.imagePrompt, "imagePrompt")} 
              className="w-full mt-2 bg-gray-800 text-white text-sm py-3 rounded font-bold hover:bg-black transition-colors"
            >
              {copiedStates["imagePrompt"] ? "コピーしました" : "画像生成用プロンプトをコピー"}
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-800">STEP 5: 週報画像の選択（任意）</h3>
            <p className="text-sm text-gray-600">
              生成した週報画像を以下からアップロードしてください。Excelの「J8」セルへ自動的に貼り付けられます。画像を貼らない場合はそのまま進んでください。
            </p>
            <input
              type="file" accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer"
            />
            {reportImage && (
              <p className="text-sm font-bold text-green-600">✓ 適用画像: {reportImage.name}</p>
            )}
          </div>

          <button 
            onClick={downloadExcel} 
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 font-bold py-4 rounded text-white shadow-lg transition-all text-lg"
          >
            {isLoading ? "Excelファイル出力中..." : reportImage ? "画像を適用して最終Excelを出力する" : "画像なしでExcelを出力する"}
          </button>

          <button onClick={() => setCurrentStep("input")} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300">
            戻る
          </button>
        </section>
      )}

      {/* 環境設定タブ */}
      {currentStep === "settings" && (
        <section className="space-y-6">
          <div className="bg-blue-50 p-4 rounded border border-blue-200 flex items-center justify-between">
            <div className="text-sm text-blue-900">
              <p className="font-bold">自動読み込み</p>
              <p className="text-xs">アップロード済みファイルの「0420週」シートから班番号とメンバー構成を読み取ります。</p>
            </div>
            <button 
              onClick={handleImport}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-blue-300"
            >
              {isLoading ? "読込中..." : copiedStates["import"] ? "設定しました" : "ファイルから参照し設定する"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-bold">班番号</label><input className="w-full border rounded p-2 mt-1" value={settings.groupNumber} onChange={(e) => updateSettings({ ...settings, groupNumber: e.target.value })} /></div>
            <div><label className="text-sm font-bold">テーマ</label><input className="w-full border rounded p-2 mt-1" value={settings.theme} onChange={(e) => updateSettings({ ...settings, theme: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-bold">詳細</label><textarea className="w-full border rounded p-2 mt-1" rows={6} value={settings.themeDetails} onChange={(e) => updateSettings({ ...settings, themeDetails: e.target.value })} /></div>
          
          {/* タスク設定 */}
          <div className="border-t pt-4">
            <div className="flex justify-between mb-4"><h3 className="font-bold text-gray-800">タスクの初期設定・管理</h3><button onClick={addSettingTask} className="text-xs bg-gray-200 px-3 py-1 rounded font-bold hover:bg-gray-300">＋ タスク追加</button></div>
            <div className="grid gap-3">
              {settings.tasks.map((task, i) => (
                <div key={task.id} className="flex flex-col gap-2 bg-gray-50 p-3 rounded border">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${task.isCompleted ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-indigo-700'}`}>
                      {task.isCompleted ? '完了' : '進行中'}
                    </span>
                    <input placeholder="タスク名" className={`flex-1 border rounded p-2 text-sm bg-white ${task.isCompleted ? 'line-through text-gray-400' : ''}`} value={task.name} onChange={(e) => handleSettingTaskChange(i, "name", e.target.value)} />
                    <button onClick={() => removeSettingTask(i)} className="text-gray-400 hover:text-red-500 px-2 font-bold text-xl">×</button>
                  </div>
                  <div className="flex items-center gap-3 pl-6">
                    <span className="text-xs font-bold text-gray-600">進捗度:</span>
                    <input type="range" min="0" max="100" value={task.progress} onChange={(e) => handleSettingTaskChange(i, "progress", Number(e.target.value))} className="flex-1" />
                    <input type="number" min="0" max="100" value={task.progress} onChange={(e) => handleSettingTaskChange(i, "progress", Number(e.target.value))} className="w-16 border rounded p-1 text-sm text-right bg-white" />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              ))}
              {settings.tasks.length === 0 && <p className="text-sm text-gray-500">タスクが設定されていません。</p>}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between mb-4"><h3 className="font-bold text-gray-800">メンバー設定</h3><button onClick={addMember} className="text-xs bg-gray-200 px-3 py-1 rounded font-bold hover:bg-gray-300">＋ メンバー追加</button></div>
            <div className="grid gap-2">
              {settings.members.map((m, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                  <input placeholder="出席番号" className="w-20 border rounded p-2 text-sm bg-white" value={m.id} onChange={(e) => handleMemberChange(i, "id", e.target.value)} />
                  <input placeholder="氏名" className="flex-1 border rounded p-2 text-sm bg-white" value={m.name} onChange={(e) => handleMemberChange(i, "name", e.target.value)} />
                  <input placeholder="恒久的な担当作業" className="flex-1 border rounded p-2 text-sm bg-white" value={m.role || ""} onChange={(e) => handleMemberChange(i, "role", e.target.value)} />
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