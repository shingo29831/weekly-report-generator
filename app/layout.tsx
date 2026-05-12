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
      <body>{children}</body>
    </html>
  );
}