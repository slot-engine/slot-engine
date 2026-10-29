import SlotEngineIcon from "@/assets/slot-engine-icon.png"
import { IconBook, IconDeviceGamepad2, IconExternalLink } from "@tabler/icons-react"
import { Link, useLocation } from "@tanstack/react-router"
import { cn } from "../../lib/cn"
import type { LinkItem } from "../../lib/types"

export const Navigation = () => {
  const location = useLocation()

  const navLinks: LinkItem[] = [
    {
      label: "Games",
      href: "/games",
      icon: <IconDeviceGamepad2 size={20} stroke={1.5} aria-hidden />,
    },
    {
      label: "Docs",
      href: "https://slot-engine.dev",
      icon: <IconBook size={20} stroke={1.5} aria-hidden />,
      target: "blank",
    },
  ]

  return (
    <nav className="h-screen sticky top-0 px-3 bg-ui-950">
      <Link
        to="/"
        className="flex items-center gap-2 h-14 px-3 rounded-lg"
        translate="no"
      >
        <img src={SlotEngineIcon} alt="" width={24} height={24} />
        <span className="font-semibold">Slot Engine</span>
        <span className="h-4 w-px bg-ui-700" aria-hidden />
        <span className="text-ui-500">Panel</span>
      </Link>
      <div className="mt-4 flex flex-col gap-1">
        {navLinks.map((link) => (
          <Link
            to={link.href}
            key={link.href}
            target={link.target}
            className={cn(
              "flex items-center gap-2 h-9 px-3 rounded-lg text-ui-100 transition-colors duration-150 hover:bg-ui-900 hover:text-ui-50",
              location.pathname.includes(link.href) &&
                "bg-ui-800 text-ui-50 hover:bg-ui-800",
            )}
          >
            {link.icon}
            {link.label}
            {link.target?.includes("blank") && (
              <IconExternalLink
                size={20}
                stroke={1.5}
                className="ml-auto text-ui-500"
                aria-hidden
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
