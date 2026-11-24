import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "체력측정",
  description: "선수의 점프 높이를 이전 기록과 비교해 얼마나 변했는지 바로 확인합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
