import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ClassPulse — Smart Attendance",
  description:
    "AI-assisted, teacher-confirmed attendance for schools and colleges. Camera-based face recognition with full teacher review.",
  // Android Chrome address bar + task-switcher colour
  themeColor: "#6d4aff",
  // iOS/Android bookmark icon
  icons: {
    apple: "/icons/icon-192.png"
  },
  // No robots indexing for the MVP (school data app)
  robots: { index: false, follow: false }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
