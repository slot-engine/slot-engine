import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { query, type APIResponse } from "../../lib/queries"
import { cva } from "../../lib/cn"
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react"

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

  return (
    <div>
      <h1 className="mb-8">Games</h1>

      {data && data.games.length > 0 && <GamesList {...data} />}
    </div>
  )
}

function GamesList(data: APIResponse<"games">) {
  const boxStyles = cva({
    base: "p-6 bg-ui-900 border rounded-lg flex justify-between items-center gap-8",
    variants: {
      isValid: {
        true: "border-ui-700 hover:bg-ui-800",
        false: "border-red-500",
      },
    },
  })

  return (
    <div className="space-y-4">
      {data.games.map((game) =>
        game.isValid ? (
          <Link to="/games/:id" className={boxStyles({ isValid: game.isValid })} key={game.id}>
            <div>
              <div className="text-ui-500">{game.id}</div>
              <h2>{game.name}</h2>
              <div className="text-sm text-ui-500 flex items-center gap-1">
                <IconCheck size={16} />
                {game.path}
              </div>
            </div>
            <div>
              <IconArrowRight size={64} stroke={1} />
            </div>
          </Link>
        ) : (
          <div className={boxStyles({ isValid: game.isValid })} key={game.id}>
            <div>
              <div className="text-ui-500">{game.id}</div>
              <h2>{game.name}</h2>
              <div className="text-sm text-red-600 flex items-center gap-1">
                <IconX size={16} />
                {game.path}
              </div>
            </div>
            <div className="max-w-xl p-2 bg-red-700 rounded-sm">
              Uh-oh! <b>This game is not properly configured</b>. Please make sure you
              have configured <code>rootDir: __dirname</code> when calling{" "}
              <code>createSlotGame()</code>.
            </div>
          </div>
        ),
      )}
    </div>
  )
}
