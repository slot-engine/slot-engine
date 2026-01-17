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
    <div className="border-r border-ui-700 h-screen sticky top-0">
      <Link to="/" className="flex items-center gap-2 px-4 h-14 border-b border-ui-700">
        <div className="flex items-center gap-2">
          <img src={SlotEngineIcon} alt="" width={24} height={24} />
          <span className="font-bold">Slot Engine</span>
        </div>
        <div className="h-6 w-0.5 bg-ui-500"></div>
        <span>Panel</span>
      </Link>
      <div className="mt-8">
        {navLinks.map((link) => (
          <Link
            to={link.href}
            key={link.href}
            target={link.target}
            className={cn(
              "flex items-center gap-2 hover:bg-ui-800 px-3 py-2",
              location.pathname.includes(link.href) && "bg-ui-700  hover:bg-ui-700",
            )}
          >
            {link.icon}
            {link.label}
            {link.target?.includes("blank") && (
              <IconExternalLink className="ml-auto text-ui-500" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
