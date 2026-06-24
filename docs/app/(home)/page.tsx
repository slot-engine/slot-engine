import {
  ArrowRight,
  CircuitBoard,
  LayoutDashboard,
  Server,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Logo from "@/assets/slot-engine-icon.png"
import { CopyCommand } from "@/components/CopyCommand"
import { ShaderBackground } from "@/components/ShaderBackground"

const features = [
  {
    icon: CircuitBoard,
    title: "Slot Engine Core",
    description:
      "Configure and simulate slot games. Produces output compatible with Stake Engine / Stake RGS.",
    href: "/docs/core",
  },
  {
    icon: LayoutDashboard,
    title: "Slot Engine Panel",
    description:
      "A web GUI for Slot Engine. Run simulations, view statistics and explore your game files.",
    href: "/docs/panel",
  },
  {
    icon: Server,
    title: "Slot Engine LGS",
    description:
      "Local gaming server. Test your game locally without uploading to Stake Engine and save time.",
    href: "/docs/lgs",
  },
]

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Hero with animated shader background */}
      <section className="relative isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
        <ShaderBackground className="absolute inset-0 -z-20 h-full w-full" />
        {/* readability scrims */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-black/20" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 42%, rgba(2,6,16,0.55) 0%, rgba(2,6,16,0) 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-b from-transparent to-fd-background"
        />

        <Link
          href="/docs/core/what-is-slot-engine"
          className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-md transition hover:border-white/30 hover:text-white"
        >
          <Sparkles className="size-4 text-cyan-300" />
          A TypeScript-first slot game math toolkit
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </Link>

        <div className="mb-6 flex items-center justify-center gap-3">
          <Image
            src={Logo}
            height={40}
            width={40}
            alt=""
            className="rounded-lg"
          />
          <span className="text-2xl font-bold tracking-tight text-white">
            Slot Engine
          </span>
        </div>

        <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
          Build highly customizable{" "}
          <span className="bg-linear-to-r from-sky-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
            slot games
          </span>{" "}
          with TypeScript
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-lg text-white/70 lg:text-xl">
          A family of TypeScript libraries for building, simulating and testing
          slot games - math, game logic and tooling.
        </p>

        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/docs/core"
            className="group inline-flex items-center gap-2 rounded-full bg-linear-to-r from-sky-500 to-cyan-400 px-7 py-3.5 text-base font-semibold text-white ring-1 ring-white/20 transition active:scale-[0.98] lg:text-lg"
          >
            Get Started
            <ArrowRight className="size-5 transition group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/slot-engine/slot-engine"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/15 lg:text-lg"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.89.12 3.19.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
            View on GitHub
          </a>
        </div>

        <div className="mt-8">
          <CopyCommand command="npm i @slot-engine/core" />
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 se-grid se-grid-mask opacity-60"
        />
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Everything* you need to ship a slot
          </h2>
          <p className="mt-4 text-fd-muted-foreground">
            From math and simulation to local testing and tooling - Slot Engine
            is on its way to be a complete ecosystem.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative flex flex-col rounded-2xl border border-fd-border bg-fd-card/50 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-fd-primary/40 hover:bg-fd-card hover:shadow-xl hover:shadow-sky-500/10"
            >
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-fd-border bg-fd-background/60 text-fd-primary transition group-hover:border-fd-primary/40 group-hover:bg-fd-primary/10">
                <feature.icon className="size-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                {feature.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-fd-primary">
                Learn more
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center mt-8 text-fd-muted-foreground">*Not including client-side tools yet</p>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mb-24 w-full max-w-5xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-fd-border bg-linear-to-br from-fd-card to-fd-background px-6 py-14 text-center md:px-12 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-balance text-3xl font-bold tracking-tight lg:text-5xl">
              Ready to build your slot game?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-fd-muted-foreground">
              Dive into the docs and ship your first simulated game in minutes.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/docs/core"
                className="group inline-flex items-center gap-2 rounded-full bg-linear-to-r from-sky-500 to-cyan-400 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 transition active:scale-[0.98] lg:text-lg"
              >
                Get Started
                <ArrowRight className="size-5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs/core/core-concepts"
                className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-8 py-4 text-base font-semibold text-fd-foreground backdrop-blur-sm transition hover:border-fd-primary/40 hover:bg-fd-card lg:text-lg"
              >
                Core Concepts
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
