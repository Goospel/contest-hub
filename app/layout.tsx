import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "contest-hub — 공모전 모아보기",
  description:
    "인터넷에 흩어진 공모전을 자동으로 모아 마감 임박순으로 보여줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
