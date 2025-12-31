import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../../components/Error"
import { Loading } from "../../components/Loading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/Tabs"
import {
  IconCoin,
  IconColumns3,
  IconFileSearch,
  IconInfoCircle,
  IconRepeat,
} from "@tabler/icons-react"
import { z } from "zod"
import { GameProvider } from "../../context/GameContext"
import { GameInformation } from "../../components/GameInformation"
import { GameSimulation } from "../../components/GameSimulation"
import { GameSimulationSummary } from "../../components/GameSimulationSummary"
import { GameExplorer } from "../../components/GameExplorer"

const tabsNames = {
  info: "info",
  simulation: "simulation",
  betSimulation: "bet-simulation",
  "reelset-designer": "reelset-designer",
  explorer: "explorer",
}

export const Route = createFileRoute("/games/$gameId")({
  component: RouteComponent,
  validateSearch: z.object({
    tab: z.string().optional().default(tabsNames.info),
  }),
})

function RouteComponent() {
  const { gameId } = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const { tab } = Route.useSearch()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      return await query.game(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  function setUrlTab(tab: string) {
    navigate({
      search: () => ({ tab }),
    })
  }

  return (
    <GameProvider gameId={gameId}>
      <h1 className="mb-8">{data.name}</h1>

      <Tabs defaultValue={tab}>
        <TabsList className="sticky top-0 z-10 bg-ui-950">
          <TabsTrigger value={tabsNames.info} onClick={() => setUrlTab(tabsNames.info)}>
            <IconInfoCircle />
            Game Information
          </TabsTrigger>
          <TabsTrigger
            value={tabsNames.simulation}
            onClick={() => setUrlTab(tabsNames.simulation)}
          >
            <IconRepeat />
            Game Simulation
          </TabsTrigger>
          <TabsTrigger
            value={tabsNames.betSimulation}
            onClick={() => setUrlTab(tabsNames.betSimulation)}
          >
            <IconCoin />
            Bet Simulation
          </TabsTrigger>
          <TabsTrigger
            value={tabsNames["reelset-designer"]}
            onClick={() => setUrlTab(tabsNames["reelset-designer"])}
          >
            <IconColumns3 />
            Reel Set Designer
          </TabsTrigger>
          <TabsTrigger
            value={tabsNames.explorer}
            onClick={() => setUrlTab(tabsNames.explorer)}
          >
            <IconFileSearch />
            Explorer
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tabsNames.info}>
          <InfoTab />
        </TabsContent>
        <TabsContent value={tabsNames.simulation}>
          <SimulationTab />
        </TabsContent>
        <TabsContent value={tabsNames["reelset-designer"]}>
          <ReelSetDesignerTab />
        </TabsContent>
        <TabsContent value={tabsNames.explorer}>
          <ExplorerTab />
        </TabsContent>
      </Tabs>
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

const InfoTab = () => {
  return (
    <div>
      <TabContentHeader
        title="Game Information"
        description="Basic information about the game."
      />
      <GameInformation />
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

const ReelSetDesignerTab = () => {
  return (
    <div>
      <TabContentHeader
        title="Reel Set Designer"
        description="Design and modify static reel sets for this game."
      />
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
