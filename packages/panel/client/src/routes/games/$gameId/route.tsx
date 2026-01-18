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
import { PageHeader } from "@/components/Page"
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
      <Outlet />
    </GameProvider>
  )
}
