import { GameExplorer } from "@/components/GameExplorer"
import { PageContent } from "@/components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/games/$gameId/explorer/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <PageContent>
      <GameExplorer />
    </PageContent>
  )
}
