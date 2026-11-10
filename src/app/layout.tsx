import type { Metadata } from "next";
import "./globals.css";
import { LabProvider } from "@/components/LabProvider";
import { Navbar } from "@/components/Navbar";
import { PentesterHud } from "@/components/PentesterHud";

export const metadata: Metadata = {
  title: "VulnLab // NexusStore — OWASP WSTG Vulnerable Web Application",
  description:
    "Modern serverless Damn Vulnerable Web Application for demonstrating penetration testing tools, scanners, and OWASP WSTG security assessments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 pb-20 antialiased">
        <LabProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <PentesterHud />
        </LabProvider>
      </body>
    </html>
  );
}

