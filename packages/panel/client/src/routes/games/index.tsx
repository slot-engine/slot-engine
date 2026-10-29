import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { query, type APIResponse } from "../../lib/queries"
import { cn, cva } from "../../lib/cn"
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react"
import { ErrorDisplay } from "@/components/Error"
import { Loading } from "@/components/Loading"
import { GameNotConfigured } from "@/components/Error/GameNotConfigured"
import { PageContent, PageHeader } from "@/components/Page"
import { ShaderBackground } from "@/components/ShaderBackground"

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
          <div className="flex flex-col justify-center items-center gap-1">
            <h2 className="text-xl">No Games configured</h2>
            <p className="text-ui-500">
              Add games to Panel by editing your Panel configuration:
            </p>
            <pre className="p-4 rounded-2xl bg-ui-900 shadow-card mt-4 overflow-x-auto">
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
    base: "relative isolate overflow-clip min-h-40 p-4 flex flex-col gap-4 rounded-2xl bg-ui-900 shadow-card",
    variants: {
      isValid: {
        true: "group press",
        false: "ring-1 ring-danger-500",
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
            <GameCardTitle game={game} />
            <IconArrowRight
              size={20}
              stroke={1.5}
              className="mt-auto self-end text-ui-500 transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-accent-500"
              aria-hidden
            />
            <ShaderBackground />
          </Link>
        ) : (
          <div className={boxStyles({ isValid: game.isValid })} key={game.id}>
            <GameCardTitle game={game} />
            <GameNotConfigured />
            <ShaderBackground variant="danger" />
          </div>
        ),
      )}
    </div>
  )
}

const GameCardTitle = ({ game }: { game: APIResponse<"games">["games"][number] }) => {
  const StatusIcon = game.isValid ? IconCheck : IconX

  return (
    <div className="min-w-0">
      <h2 className="text-base font-medium truncate" title={game.name}>
        {game.name}
      </h2>
      <div className="mt-1 text-ui-500 truncate" title={game.id} translate="no">
        {game.id}
      </div>
      <div
        className={cn(
          "flex items-center gap-1 text-ui-500",
          !game.isValid && "text-danger-500",
        )}
      >
        <StatusIcon size={20} stroke={1.5} className="shrink-0" aria-hidden />
        <span className="truncate" title={game.path}>
          {game.path}
        </span>
      </div>
    </div>
  )
}
