import Link from "next/link";
import { MessageSquare, Bug, Wrench, ShieldCheck, AlertTriangle } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center max-w-4xl mx-auto space-y-12">
      <div className="space-y-6">
        <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
          <span className="text-white font-bold text-5xl leading-none mt-[-4px]">A</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          AutoRAG Platform
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          High-precision automotive retrieval-augmented generation. 
          Powered by FastAPI, Voyage AI Reranking, and Google A2UI structured components.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <Link href="/chat" className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800/80 transition-all text-left">
          <MessageSquare className="h-8 w-8 text-blue-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300">General Chat</h2>
          <p className="text-sm text-zinc-400">Standard Q&A interface covering the entire automotive knowledge base.</p>
        </Link>
        
        <Link href="/debug" className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800/80 transition-all text-left">
          <Bug className="h-8 w-8 text-purple-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300">Pipeline Debugger</h2>
          <p className="text-sm text-zinc-400">Developer tool to inspect vector similarity, BM25, RRF fusion, and Reranker scores.</p>
        </Link>
      </div>

      <div className="w-full pt-8 border-t border-zinc-800/80">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-6">A2UI Critical Pathways</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/maintenance" className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors">
            <Wrench className="h-6 w-6 text-emerald-400 mb-2" />
            <span className="text-sm font-medium text-zinc-300">Maintenance</span>
          </Link>
          <Link href="/warranty" className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors">
            <ShieldCheck className="h-6 w-6 text-emerald-400 mb-2" />
            <span className="text-sm font-medium text-zinc-300">Warranty</span>
          </Link>
          <Link href="/safety" className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors">
            <AlertTriangle className="h-6 w-6 text-emerald-400 mb-2" />
            <span className="text-sm font-medium text-zinc-300">Safety Alerts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
