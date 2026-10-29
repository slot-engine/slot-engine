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
  IconPlayerPlay,
  IconRepeat,
} from "@tabler/icons-react"
import { GameProvider } from "@/context/GameContext"
import { PageHeader } from "@/components/Page"
import { cn } from "@/lib/cn"
import { tabPillStyles } from "@/components/Tabs"

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

  const activeStyles = "bg-ui-800 text-ui-50 hover:bg-ui-800"

  const pathname = location.pathname.split("/").at(-1)
  const isActivePath = (path: string) => pathname === path

  return (
    <GameProvider gameId={gameId}>
      <PageHeader title={data.name}>
        <nav className="flex items-center gap-1">
          <Link
            to="/games/$gameId/info"
            params={params}
            className={cn(tabPillStyles, isActivePath("info") && activeStyles)}
          >
            <IconInfoCircle size={20} stroke={1.5} aria-hidden />
            Game Information
          </Link>
          <Link
            to="/games/$gameId/play"
            params={params}
            className={cn(tabPillStyles, isActivePath("play") && activeStyles)}
          >
            <IconPlayerPlay size={20} stroke={1.5} aria-hidden />
            Play Game
          </Link>
          <Link
            to="/games/$gameId/simulation"
            params={params}
            className={cn(tabPillStyles, isActivePath("simulation") && activeStyles)}
          >
            <IconRepeat size={20} stroke={1.5} aria-hidden />
            Game Simulation
          </Link>
          <Link
            to="/games/$gameId/bet-simulation"
            params={params}
            className={cn(tabPillStyles, isActivePath("bet-simulation") && activeStyles)}
          >
            <IconCoin size={20} stroke={1.5} aria-hidden />
            Bet Simulation
          </Link>
          <Link
            to="/games/$gameId/reelset-designer"
            params={params}
            className={cn(
              tabPillStyles,
              isActivePath("reelset-designer") && activeStyles,
            )}
          >
            <IconColumns3 size={20} stroke={1.5} aria-hidden />
            Reel Set Designer
          </Link>
          <Link
            to="/games/$gameId/explorer"
            params={params}
            className={cn(tabPillStyles, isActivePath("explorer") && activeStyles)}
          >
            <IconFileSearch size={20} stroke={1.5} aria-hidden />
            Explorer
          </Link>
        </nav>
      </PageHeader>
      <Outlet />
    </GameProvider>
  )
}
