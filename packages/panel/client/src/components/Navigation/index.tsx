import SlotEngineIcon from "@/assets/slot-engine-icon.png"
import { IconBook, IconDeviceGamepad2 } from "@tabler/icons-react"
import { Link, useLocation } from "@tanstack/react-router"
import { cn } from "../../lib/cn"
import type { LinkItem } from "../../lib/types"

export const Navigation = () => {
  const location = useLocation()

  const navLinks: LinkItem[] = [
    {
      label: "Games",
      href: "/games",
      icon: <IconDeviceGamepad2 />,
    },
    {
      label: "Docs",
      href: "https://slot-engine.dev",
      icon: <IconBook />,
      target: "blank",
    },
  ]

  return (
    <div className="border-b border-ui-700">
      <div className="px-4 py-2 flex gap-8 items-center max-w-page-width mx-auto border-x border-ui-700">
        <Link to="/" className="flex items-center gap-2 py-2">
          <div className="flex items-center gap-2">
            <img src={SlotEngineIcon} alt="" width={24} height={24} />
            <span className="font-bold">Slot Engine</span>
          </div>
          <div className="h-6 w-0.5 bg-ui-500"></div>
          <span>Panel</span>
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              to={link.href}
              key={link.href}
              target={link.target}
              className={cn(
                "flex items-center gap-2 hover:bg-ui-800 px-3 py-2 rounded-lg",
                location.pathname.includes(link.href) && "bg-ui-700  hover:bg-ui-700",
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
