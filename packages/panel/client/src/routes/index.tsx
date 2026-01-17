import { createFileRoute, Link } from "@tanstack/react-router"
import type { LinkItem } from "../lib/types"
import { IconBook, IconDeviceGamepad2 } from "@tabler/icons-react"
import { cn } from "../lib/cn"
import { GridBackground } from "@/components/GridBackground"

export const Route = createFileRoute("/")({
  component: RouteComponent,
})

function RouteComponent() {
  const navLinks: LinkItem[] = [
    {
      label: "Games",
      href: "/games",
      icon: <IconDeviceGamepad2 size={64} stroke={1} />,
      description: "Go to your games",
    },
    {
      label: "Docs",
      href: "https://slot-engine.dev",
      icon: <IconBook size={64} stroke={1} />,
      description: "Open up the documentation",
      target: "blank",
    },
  ]

  return (
    <div className="flex justify-center mt-16">
      <div className="w-full max-w-4xl">
        <h1 className="mb-8 text-center">Welcome back!</h1>
        <div className="grid grid-cols-2 gap-4">
          {navLinks.map((link) => (
            <Link
              to={link.href}
              key={link.href}
              target={link.target}
              className="relative overflow-clip flex items-center gap-4 text-xl p-6 border border-ui-700 rounded-lg"
            >
              {link.icon}
              <div>
                {link.label}
                {link.description && (
                  <p className="text-sm text-ui-100">{link.description}</p>
                )}
              </div>
              <GridBackground />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
