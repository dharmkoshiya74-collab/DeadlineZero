import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DeadlineZero | Your Academic Operating System",
    template: "%s | DeadlineZero",
  },
  description:
    "Plan smarter, stay consistent, and turn academic deadlines into achievable study sessions with DeadlineZero.",
  applicationName: "DeadlineZero",
  keywords: [
    "student planner",
    "study planner",
    "academic productivity",
    "study schedule",
    "DeadlineZero",
  ],
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
