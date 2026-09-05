"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language?: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          aria-label={`Copy ${language || "code"} code`}
          className="focus-ring flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto">
        <code className="block p-4 text-[13px] leading-6 font-mono">{code}</code>
      </pre>
    </div>
  );
}
