import { createFileRoute, Link } from "@tanstack/react-router"
import type { LinkItem } from "../lib/types"
import { IconBook, IconDeviceGamepad2 } from "@tabler/icons-react"
import { ShaderBackground } from "@/components/ShaderBackground"

export const Route = createFileRoute("/")({
  component: RouteComponent,
})

function RouteComponent() {
  const navLinks: LinkItem[] = [
    {
      label: "Games",
      href: "/games",
      icon: <IconDeviceGamepad2 size={32} stroke={1.5} aria-hidden />,
      description: "Go to your games",
    },
    {
      label: "Docs",
      href: "https://slot-engine.dev",
      icon: <IconBook size={32} stroke={1.5} aria-hidden />,
      description: "Open up the documentation",
      target: "blank",
    },
  ]

  return (
    <div className="flex justify-center px-6 pt-24">
      <div className="w-full max-w-5xl">
        <h1 className="mb-6 text-center">Welcome back!</h1>
        <div className="grid grid-cols-2 gap-4">
          {navLinks.map((link) => (
            <Link
              to={link.href}
              key={link.href}
              target={link.target}
              className="group press relative isolate overflow-clip min-h-56 p-8 flex flex-col justify-between gap-6 rounded-2xl bg-ui-900 shadow-card"
            >
              <div className="size-16 flex items-center justify-center rounded-xl bg-ui-800 text-ui-50 transition-colors duration-150 group-hover:text-accent-500">
                {link.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold">{link.label}</div>
                {link.description && (
                  <p className="mt-1 text-ui-500">{link.description}</p>
                )}
              </div>
              <ShaderBackground />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
