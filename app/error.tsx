// @ai-role: client-side error boundary recovering from runtime errors and chunk mismatch

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunkError =
      error.message?.includes("Loading chunk") ||
      error.message?.includes("ChunkLoadError") ||
      error.name === "ChunkLoadError";

    if (isChunkError) {
      const lastReload = Number(sessionStorage.getItem("last_chunk_reload") || 0);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem("last_chunk_reload", String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-lg border shadow-sm text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          アプリの更新、または一時的なエラーが発生しました
        </h2>
        <p className="text-sm text-gray-600">
          新しいバージョンが配信された可能性があります。最新の状態に更新して再試行してください。
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded font-bold hover:bg-indigo-700 transition-colors text-sm"
          >
            最新版を読み込む
          </button>
          <button
            onClick={() => reset()}
            className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded font-bold hover:bg-gray-300 transition-colors text-sm"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  );
}
