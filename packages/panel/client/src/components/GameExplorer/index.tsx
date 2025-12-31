import { useInfiniteQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import { useEffect, useRef, useState } from "react"
import { query } from "../../lib/queries"
import { Loading } from "../Loading"
import { LookupTableRow } from "../LookupTableRow"
import { Accordion } from "@base-ui/react/accordion"
import { IconLoader2 } from "@tabler/icons-react"
import { useVirtualizer } from "@tanstack/react-virtual"

export const GameExplorer = () => {
  const { gameId, data: game } = useGameContext()
  const [mode, setMode] = useState(game.modes[0]?.name || "")

  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["game", "explore", gameId, mode],
      queryFn: async ({ pageParam }) => {
        return await query.gameExplore({ gameId, mode, cursor: pageParam })
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    })

  const scrollRef = useRef<HTMLDivElement>(null)

  const luts = data ? data.pages.flatMap((p) => p.lut) : []
  const lutsSegmented = data ? data.pages.flatMap((p) => p.lutSegmented) : []

  const virtualizer = useVirtualizer({
    count: hasNextPage ? luts.length + 1 : luts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const items = virtualizer.getVirtualItems()

  useEffect(() => {
    const [lastItem] = [...items].reverse()

    if (!lastItem) return

    if (lastItem.index >= luts.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, fetchNextPage, luts.length, isFetchingNextPage, items])

  return (
    <div className="grid grid-cols-[1fr_3fr] gap-12">
      <div className="mb-4">
        <Select
          label="Mode"
          value={mode}
          multiple={false}
          onValueChange={(v) => setMode(v || "")}
        >
          <SelectTrigger placeholder="Choose Mode" className="w-full" />
          <SelectContent>
            {game.modes.map((m) => (
              <SelectItem key={m.name} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        {isLoading && <Loading isLoading />}

        {luts && !isLoading && (
          <div>
            <div className="mb-1 text-ui-500">Loaded {luts.length} rows</div>
            <div className="max-h-192 overflow-y-auto pr-2" ref={scrollRef}>
              <Accordion.Root
                multiple
                style={{
                  height: virtualizer.getTotalSize(),
                  width: "100%",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${items[0]?.start ?? 0}px)`,
                  }}
                >
                  {items.map((virtualRow) => {
                    const isLoader = virtualRow.index > luts.length - 1
                    const lut = luts[virtualRow.index]
                    const lutSegmented = lutsSegmented[virtualRow.index]

                    if (isLoader) {
                      return hasNextPage ? (
                        <div className="p-6 flex justify-center items-center gap-2">
                          <IconLoader2 className="animate-spin" />
                          Loading more
                        </div>
                      ) : null
                    }
                    return (
                      <LookupTableRow
                        key={`${virtualRow.index}`}
                        mode={mode}
                        lut={lut}
                        lutSegmented={lutSegmented}
                      />
                    )
                  })}
                </div>
              </Accordion.Root>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
