import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { query, type APIResponse } from "../../lib/queries"
import { cva } from "../../lib/cn"
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react"
import { ErrorDisplay } from "@/components/Error"
import { Loading } from "@/components/Loading"
import { GameNotConfigured } from "@/components/Error/GameNotConfigured"
import { PageContent, PageHeader } from "@/components/Page"
import { GridBackground } from "@/components/GridBackground"

export const Route = createFileRoute("/games/")({
  component: GamesPage,
})

function GamesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      return await query.games()
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  return (
    <div>
      <PageHeader title="Games" />
      <PageContent>
        {data.games.length === 0 && (
          <div className="flex flex-col justify-center items-center">
            <h2>No Games configured</h2>
            <p>Add games to Panel by editing your Panel configuration:</p>
            <pre className="p-4 rounded-lg bg-ui-900 mt-4">
              {`import { createPanel } from "./server"
import { game as MyGame } from "../path/to/my_game"

const panel = createPanel({
  games: [MyGame],
})

panel.start()`}
            </pre>
          </div>
        )}
        <GamesList {...data} />
      </PageContent>
    </div>
  )
}

function GamesList(data: APIResponse<"games">) {
  const boxStyles = cva({
    base: "relative overflow-clip p-6 border rounded-lg gap-8 flex flex-col",
    variants: {
      isValid: {
        true: "border-ui-700",
        false: "border-red-500",
      },
    },
  })

  return (
    <div className="grid grid-cols-4 gap-4">
      {data.games.map((game) =>
        game.isValid ? (
          <Link
            to="/games/$gameId/info"
            params={{ gameId: game.id }}
            className={boxStyles({ isValid: game.isValid })}
            key={game.id}
          >
            <div>
              <div className="text-ui-500">{game.id}</div>
              <h2>{game.name}</h2>
              <div className="text-sm text-ui-500 flex items-center gap-1">
                <IconCheck size={16} className="shrink-0" />
                <abbr className="truncate" title={game.path}>
                  {game.path}
                </abbr>
              </div>
            </div>
            <div className="mt-auto pt-8">
              <IconArrowRight size={64} stroke={1} />
            </div>
            <GridBackground />
          </Link>
        ) : (
          <div className={boxStyles({ isValid: game.isValid })} key={game.id}>
            <div>
              <div className="text-ui-500">{game.id}</div>
              <h2>{game.name}</h2>
              <div className="text-sm text-red-600 flex items-center gap-1">
                <IconX size={16} className="shrink-0" />
                <abbr className="truncate" title={game.path}>
                  {game.path}
                </abbr>
              </div>
            </div>
            <GameNotConfigured />
            <GridBackground variant="danger" />
          </div>
        ),
      )}
    </div>
  )
}
