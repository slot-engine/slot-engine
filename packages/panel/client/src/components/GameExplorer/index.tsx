import { useInfiniteQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import { useState } from "react"
import { query } from "../../lib/queries"
import { Loading } from "../Loading"

export const GameExplorer = () => {
  const { gameId, data: game } = useGameContext()
  const [mode, setMode] = useState(game.modes[0]?.name || "")

  const { data, isLoading, error } = useInfiniteQuery({
    queryKey: ["game", "explore", gameId, mode],
    queryFn: async ({ pageParam }) => {
      return await query.gameExplore({ gameId, mode, cursor: pageParam })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  return (
    <div>
      <div>
        <Select
          label="Mode"
          value={mode}
          multiple={false}
          onValueChange={(v) => setMode(v || "")}
        >
          <SelectTrigger placeholder="Choose Mode" className="w-64" />
          <SelectContent>
            {game.modes.map((m) => (
              <SelectItem key={m.name} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Loading isLoading />}

      {data && !isLoading && (
        <div>
          {data.pages.map((page, pid) =>
            page.lut.map(([id, weight, payout]) => (
              <div key={`${pid}-${id}`}>
                ID: {id} | Weight: {weight} | Payout: {payout}
              </div>
            )),
          )}
        </div>
      )}
    </div>
  )
}
