import { ChevronDown } from "lucide-react"
import { JsonLd } from "@/components/JsonLd"
import { absoluteUrl, siteUrl } from "@/lib/structured-data"

type Segment = string | { text: string; href: string } | { code: string }

const faq: Array<{ question: string; answer: Segment[] }> = [
  {
    question: "What is Slot Engine?",
    answer: [
      "Slot Engine is a family of TypeScript libraries for the math side of slot games. You configure symbols, reels and game modes, write the game flow in TypeScript and simulate millions of spins. The output is the books and lookup tables that Engine (formerly Stake Engine) expects. Slot Engine does not render your game, so you build the front end with the tools of your choice.",
    ],
  },
  {
    question: "What kind of games can I build with Slot Engine?",
    answer: [
      "Almost any slot game. You write the game flow as plain TypeScript, with built-in helpers for paylines, cluster and ways wins and tumbling boards. ",
      { text: "Custom game state", href: "/docs/core/config/custom-state" },
      " tracks anything your features need across spins, such as expanding wilds, sticky wilds, collect features, global multipliers or upgrades to a super bonus. Mechanics from games like Sweet Bonanza or Wanted Dead or a Wild fit the same model.",
    ],
  },
  {
    question: "Can AI build a slot game with Slot Engine?",
    answer: [
      "Yes. The complete documentation is available as one plain text file at ",
      { text: "/llms-full.txt", href: "/llms-full.txt" },
      ". Give it to your AI assistant or coding agent as context, and it can write the game configuration and game flow for you. The TypeScript types flag many mistakes in generated code before a simulation runs.",
    ],
  },
  {
    question: "Is Slot Engine compatible with Engine (formerly Stake Engine)?",
    answer: [
      "Yes. A ",
      { text: "simulation", href: "/docs/core/game-tasks/simulation" },
      " writes the books, lookup tables and index file that Engine expects, ready to upload as your game's math. Slot Engine is a community project and is not affiliated with Stake or Engine.",
    ],
  },
  {
    question: "How is Slot Engine different from the Stake Math SDK?",
    answer: [
      "The Stake Math SDK is a Python codebase that you clone and modify. Slot Engine is a set of TypeScript packages on npm with semantic versioning, so you upgrade with your package manager instead of merging source changes. You write the game flow in a single hook with utility functions instead of overriding SDK classes. Read the ",
      {
        text: "full comparison",
        href: "/docs/core/slot-engine-vs-stake-math-sdk",
      },
      ".",
    ],
  },
  {
    question: "How do I make my game hit a target RTP?",
    answer: [
      "Use the ",
      { text: "optimizer", href: "/docs/core/game-tasks/optimization" },
      ". It reweights the lookup tables from your simulations so the game pays exactly the configured RTP, with the hit rates and payout distribution you set per criteria. It is pure TypeScript and runs in seconds, even for millions of simulations.",
    ],
  },
  {
    question: "Can I test my game without uploading it to Engine?",
    answer: [
      "Yes. ",
      { text: "Slot Engine LGS", href: "/docs/lgs" },
      " is a local gaming server that serves the Engine RGS endpoints from your simulation results, so your front end plays against your real math on your machine. ",
      { text: "Slot Engine Panel", href: "/docs/panel" },
      " adds a web GUI to run simulations, view statistics, explore game files and play your game against the LGS.",
    ],
  },
  {
    question: "What do I need to get started?",
    answer: [
      "Node.js 22.15.0 or newer (on Node.js 23, 23.8.0 or newer), because Slot Engine uses native Zstandard compression. TypeScript is highly recommended. Install the core library with ",
      { code: "npm i @slot-engine/core" },
      " and follow the ",
      { text: "quick start", href: "/docs/core" },
      ".",
    ],
  },
]

export function Faq() {
  return (
    <section className="mx-auto mb-24 w-full max-w-3xl px-4 md:px-8">
      <JsonLd data={faqPageGraph} />
      <h2 className="mb-10 text-center text-3xl font-bold tracking-tight lg:text-4xl">
        Frequently asked questions
      </h2>
      <div className="divide-y divide-fd-border overflow-hidden rounded-2xl border border-fd-border bg-fd-card/50 backdrop-blur-sm">
        {faq.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition hover:bg-fd-accent/50 focus-visible:bg-fd-accent/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <h3 className="font-semibold">{item.question}</h3>
              <ChevronDown className="size-5 shrink-0 text-fd-muted-foreground transition group-open:rotate-180" />
            </summary>
            <p className="px-6 pb-5 leading-relaxed text-fd-muted-foreground">
              {item.answer.map((segment, i) => (
                <SegmentView key={i} segment={segment} />
              ))}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}

function SegmentView({ segment }: { segment: Segment }) {
  if (typeof segment === "string") return segment
  if ("code" in segment) {
    return (
      <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-sm text-fd-foreground">
        {segment.code}
      </code>
    )
  }
  return (
    <a
      href={segment.href}
      className="font-medium text-fd-primary underline-offset-4 hover:underline"
    >
      {segment.text}
    </a>
  )
}

const faqPageGraph = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${siteUrl}/#faq`,
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer.map(segmentHtml).join(""),
    },
  })),
}

function segmentHtml(segment: Segment) {
  if (typeof segment === "string") return escapeHtml(segment)
  if ("code" in segment) return `<code>${escapeHtml(segment.code)}</code>`
  return `<a href="${absoluteUrl(segment.href)}">${escapeHtml(segment.text)}</a>`
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
