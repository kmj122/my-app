import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATHLETE SIGNAL",
  description:
    "반동점프(CMJ) 기록 변화를 측정 오차 기준과 중요 변화 기준으로 분석하고, 코치가 다음에 확인할 행동을 안내합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
