import { GameSimulation } from "@/components/GameSimulation"
import { GameSimulationSummary } from "@/components/GameSimulationSummary"
import { PageContent } from "@/components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/games/$gameId/simulation/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <PageContent className="grid grid-cols-[minmax(0,1fr)_26rem] gap-x-4 items-start">
      <GameSimulation />
      <div className="col-start-1 row-start-2 min-w-0">
        <GameSimulationSummary />
      </div>
    </PageContent>
  )
}
