import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { baseOptions } from "@/lib/layout.shared"
import { source } from "@/lib/source"
import { CircuitBoard, LayoutDashboard, Server } from "lucide-react"

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions()}
      sidebar={{
        tabs: [
          {
            title: "Slot Engine Core",
            description: "Game logic and simulations",
            url: "/docs/core",
            icon: <CircuitBoard size={20} className="text-fd-primary" />,
          },
          {
            title: "Slot Engine Panel",
            description: "Web GUI for interacting with Slot Engine",
            url: "/docs/panel",
            icon: <LayoutDashboard size={20} className="text-fd-primary" />,
          },
          {
            title: "Slot Engine LGS",
            description: "Local gaming server for testing",
            url: "/docs/lgs",
            icon: <Server size={20} className="text-fd-primary" />,
          },
        ],
      }}
    >
      {children}
    </DocsLayout>
  )
}
