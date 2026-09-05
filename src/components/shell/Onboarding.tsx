"use client";

import { useEffect, useState } from "react";
import { BananaLogo } from "@/components/branding/BananaLogo";
import { Sparkles, Search, FolderKanban, ShieldCheck, ArrowRight, X } from "lucide-react";

const STEPS = [
  { title: "Welcome to BananaRouter", desc: "An AI-powered workspace built around OpenRouter. Your chats, docs, files, sheets, tasks — one place, locally stored, AI on demand.", icon: <BananaLogo size={20} /> },
  { title: "Connect OpenRouter", desc: "Add your API key from openrouter.ai/keys — stored server-side only, never in the browser. Use Free Router (openrouter/free) to start free.", icon: <ShieldCheck size={20} className="text-[#b45309]" /> },
  { title: "Work with context", desc: "Open a document, select text or attach files, then ask BananaRouter AI. Only selected context is sent — never the whole workspace.", icon: <FolderKanban size={20} className="text-[#b45309]" /> },
  { title: "Jump anywhere with ⌘K", desc: "Search chats, docs, files, notes — or run commands. Everything is offline-ready; AI needs network. You're set.", icon: <Search size={20} className="text-[#b45309]" /> },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    try {
      const seen = localStorage.getItem("banana:onboarded");
      if (!seen) setOpen(true);
    } catch {}
  }, []);
  const dismiss = () => {
    try { localStorage.setItem("banana:onboarded", "1"); } catch {}
    setOpen(false);
  };
  if (!open) return null;
  const step = STEPS[idx];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[480px] overflow-hidden rounded-[20px] bg-white dark:bg-[#1a1a1e] shadow-2xl border border-[hsl(var(--border))]">
        <div className="h-1 w-full bg-gradient-to-r from-[#F6C446] to-[#FDE68A]" />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))]">Step {idx+1} of {STEPS.length}</span>
            <button onClick={dismiss} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><X size={16} /></button>
          </div>
          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/50">{step.icon}</div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{step.desc}</p>
          <div className="mt-6 flex gap-2">
            {STEPS.map((_,i)=>(
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i===idx ? "bg-[#F6C446]" : i<idx ? "bg-[#FDE68A]" : "bg-[hsl(var(--muted))]"}`} />
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={dismiss} className="rounded-full px-4 py-2 text-sm hover:bg-[hsl(var(--muted))]">Skip</button>
            {idx < STEPS.length-1 ? (
              <button onClick={()=>setIdx(i=>i+1)} className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] dark:bg-white px-5 py-2 text-sm font-semibold text-white dark:text-[#1a1a1a]">Next <ArrowRight size={14} /></button>
            ) : (
              <button onClick={dismiss} className="inline-flex items-center gap-2 rounded-full bg-[#F6C446] px-5 py-2 text-sm font-semibold text-[#1a1a1a]">Get started <Sparkles size={14} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
