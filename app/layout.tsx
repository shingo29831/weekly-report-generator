// @ai-role: root layout component wrapping the application, responsible for global imports

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "週報ジェネレーター",
  description: "卒業研究の週報を自動生成・出力するアプリケーション",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function triggerReload() {
                  var now = Date.now();
                  var lastReload = Number(sessionStorage.getItem('last_chunk_reload') || 0);
                  if (now - lastReload > 10000) {
                    sessionStorage.setItem('last_chunk_reload', String(now));
                    window.location.reload();
                  }
                }
                window.addEventListener('error', function(e) {
                  var isChunkError = e && (
                    (e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('ChunkLoadError') !== -1)) ||
                    (e.target && e.target.tagName === 'SCRIPT' && e.target.src && e.target.src.indexOf('/_next/static/chunks/') !== -1)
                  );
                  if (isChunkError) triggerReload();
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e && e.reason;
                  var msg = (reason && (reason.message || reason.name || String(reason))) || '';
                  if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1) {
                    triggerReload();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}