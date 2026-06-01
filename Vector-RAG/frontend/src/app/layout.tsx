import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { HealthStatus } from "@/components/HealthStatus";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoRAG | A2UI Dashboard",
  description: "Next.js frontend for automotive RAG with A2UI component rendering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-zinc-100 min-h-screen flex overflow-hidden`}>
        <Sidebar />
        
        <main className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950/50">
          <div className="absolute top-4 right-6 z-50">
            <HealthStatus />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
