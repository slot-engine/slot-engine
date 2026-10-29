import { GameBetSimulation } from "@/components/GameBetSimulation"
import { PageContent } from "@/components/Page"
import { IconInfoCircle } from "@tabler/icons-react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/games/$gameId/bet-simulation/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <PageContent sidebar={<Sidebar />}>
      <GameBetSimulation />
    </PageContent>
  )
}

const Sidebar = () => {
  return (
    <div className="text-ui-100">
      <h4 className="flex items-center gap-2 mb-3 text-ui-50">
        <IconInfoCircle size={20} stroke={1.5} className="text-ui-500" aria-hidden />
        How does this work?
      </h4>
      <p>
        This module simulates game behavior with multiple players betting on the game
        under equal circumstances. For each “spin” a virtual player does, a random
        weighted result from the lookup table is chosen, similar to real Stake RGS
        functionality.
      </p>
      <p>
        After simulation you’ll be presented with the results and how your game performs
        on average.
      </p>
      <p>
        You can configure and run as many simultaneous simulations as you like. Your
        configuration will be saved.
      </p>
    </div>
  )
}
