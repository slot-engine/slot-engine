import { HomeLayout } from "fumadocs-ui/layouts/home"
import { baseOptions } from "@/lib/layout.shared"

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout
      {...baseOptions()}
      links={[
        {
          text: "Documentation",
          url: "/docs/core",
        },
        {
          text: "AI Docs",
          url: "/llms-full.txt",
        },
      ]}
      githubUrl="https://github.com/slot-engine/slot-engine"
    >
      {children}
    </HomeLayout>
  )
}
