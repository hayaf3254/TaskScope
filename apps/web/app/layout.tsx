import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskScope",
  description: "タスクの達成率を可視化して継続をサポート",
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
