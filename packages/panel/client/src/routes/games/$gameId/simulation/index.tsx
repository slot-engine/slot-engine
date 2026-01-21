import { GameSimulation } from "@/components/GameSimulation"
import { GameSimulationSummary } from "@/components/GameSimulationSummary"
import { PageContent } from "@/components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/games/$gameId/simulation/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <PageContent>
      <GameSimulation />
      <GameSimulationSummary />
    </PageContent>
  )
}
