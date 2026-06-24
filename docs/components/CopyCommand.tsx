"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-sm text-white/90 shadow-sm backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
      aria-label="Copy install command"
    >
      <span className="select-none text-cyan-300/80">$</span>
      <span>{command}</span>
      <span className="ml-1 text-white/50 transition group-hover:text-cyan-300">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </span>
    </button>
  )
}
