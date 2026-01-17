import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router"
import { query } from "@/lib/queries"
import { ErrorDisplay } from "@/components/Error"
import { Loading } from "@/components/Loading"
import {
  IconCoin,
  IconColumns3,
  IconFileSearch,
  IconInfoCircle,
  IconRepeat,
} from "@tabler/icons-react"
import { GameProvider } from "@/context/GameContext"
import { GameSimulation } from "@/components/GameSimulation"
import { GameSimulationSummary } from "@/components/GameSimulationSummary"
import { GameExplorer } from "@/components/GameExplorer"
import { GameBetSimulation } from "@/components/GameBetSimulation"
import { ReelSetDesigner } from "@/components/GameReelSetDesigner"
import { PageContent, PageHeader } from "@/components/Page"
import { cn } from "@/lib/cn"

export const Route = createFileRoute("/games/$gameId")({
  component: RouteComponent,
})

function RouteComponent() {
  const location = useLocation()
  const params = Route.useParams()
  const { gameId } = params

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      return await query.game(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  const linkStyles = "flex items-center gap-2 px-3 h-14 hover:bg-ui-800"

  const pathname = location.pathname.split("/").at(-1)
  const isActivePath = (path: string) => pathname === path

  return (
    <GameProvider gameId={gameId}>
      <PageHeader title={data.name}>
        <div className="flex items-center">
          <Link
            to="/games/$gameId/info"
            params={params}
            className={cn(linkStyles, isActivePath("info") && "bg-ui-700")}
          >
            <IconInfoCircle />
            Game Information
          </Link>
          <Link
            to="/games/$gameId/simulation"
            params={params}
            className={cn(linkStyles, isActivePath("simulation") && "bg-ui-700")}
          >
            <IconRepeat />
            Game Simulation
          </Link>
          <Link
            to="/games/$gameId/bet-simulation"
            params={params}
            className={cn(linkStyles, isActivePath("bet-simulation") && "bg-ui-700")}
          >
            <IconCoin />
            Bet Simulation
          </Link>
          <Link
            to="/games/$gameId/reelset-designer"
            params={params}
            className={cn(linkStyles, isActivePath("reelset-designer") && "bg-ui-700")}
          >
            <IconColumns3 />
            Reel Set Designer
          </Link>
          <Link
            to="/games/$gameId/explorer"
            params={params}
            className={cn(linkStyles, isActivePath("explorer") && "bg-ui-700")}
          >
            <IconFileSearch />
            Explorer
          </Link>
        </div>
      </PageHeader>
      <PageContent>
        <Outlet />
      </PageContent>
    </GameProvider>
  )
}

const TabContentHeader = (props: { title: string; description: string }) => {
  return (
    <div className="py-4">
      <h3>{props.title}</h3>
      <p className="text-ui-100">{props.description}</p>
    </div>
  )
}

const SimulationTab = () => {
  return (
    <div>
      <TabContentHeader title="Simulation" description="Run simulations for this game." />
      <GameSimulation />
      <GameSimulationSummary />
    </div>
  )
}

const BetSimulationTab = () => {
  return (
    <div>
      <TabContentHeader
        title="Bet Simulation"
        description="Simulate players betting on this game."
      />
      <GameBetSimulation />
    </div>
  )
}

const ReelSetDesignerTab = () => {
  return (
    <div>
      <TabContentHeader
        title="Reel Set Designer"
        description="Design and modify reel sets for this game."
      />
      <ReelSetDesigner />
    </div>
  )
}

const ExplorerTab = () => {
  return (
    <div>
      <TabContentHeader
        title="Explorer"
        description="Browse books and events of this game."
      />
      <GameExplorer />
    </div>
  )
}
