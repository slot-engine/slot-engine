import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import { useEffect, useRef, useState } from "react"
import { FetchError, query } from "../../lib/queries"
import { LookupTableRow } from "../LookupTableRow"
import { Accordion } from "@base-ui/react/accordion"
import {
  IconArrowRight,
  IconFilter,
  IconLoader2,
  IconMoodPuzzled,
  IconTrash,
} from "@tabler/icons-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import { useDebouncedState } from "@mantine/hooks"

export const GameExplorer = () => {
  const { gameId, game } = useGameContext()
  const [mode, setMode] = useState(game.modes[0]?.name || "")
  const [filter, setFilter] = useState<Array<{ name: string; value: string }>>([])
  const [payoutRange, setPayoutRange] = useDebouncedState({ min: 0, max: 100_000 }, 400)
  const [cursor, setCursor] = useState(0)

  const queryClient = useQueryClient()
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["game", "explore", gameId, mode, filter, cursor, payoutRange],
      queryFn: async ({ pageParam }) => {
        return await query.gameExplore({
          gameId,
          mode,
          cursor: pageParam,
          filter,
          payoutRange,
        })
      },
      initialPageParam: cursor,
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
    gap: 8,
  })

  const items = virtualizer.getVirtualItems()

  useEffect(() => {
    const [lastItem] = [...items].reverse()

    if (!lastItem) return

    if (lastItem.index >= luts.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, fetchNextPage, luts.length, isFetchingNextPage, items])

  function handleJumpToEntry(id: number) {
    if (isNaN(id) || id < 0) return

    setCursor(id)
    // Reset the query to start from the new cursor
    queryClient.resetQueries({ queryKey: ["game", "explore", gameId, mode, filter, id] })
  }

  return (
    <div className="grid grid-cols-[1fr_3fr] gap-8">
      <div>
        <h5 className="pb-2 mb-2 border-b border-ui-700">Filter</h5>
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
        <div className="flex gap-2 mt-2">
          <NumberInput
            label="Min. Payout Multiplier"
            defaultValue={payoutRange.min}
            value={payoutRange.min}
            onValueChange={(v) => {
              setPayoutRange((c) => ({ ...c, min: v || 0 }))
              setCursor(0)
            }}
          />
          <NumberInput
            label="Max. Payout Multiplier"
            defaultValue={payoutRange.max}
            value={payoutRange.max}
            onValueChange={(v) => {
              setPayoutRange((c) => ({ ...c, max: v || 0 }))
              setCursor(0)
            }}
          />
        </div>
        <div className="mt-4">
          <Filters
            filters={filter}
            onValueChange={(v) => {
              setCursor(0)
              setFilter(v)
            }}
            mode={mode}
          />
        </div>
        <div className="mt-4">
          <Actions onJumpToEntry={handleJumpToEntry} />
        </div>
      </div>
      <div>
        {isLoading &&
          Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 mb-2" />
          ))}

        {error && (
          <ErrorDisplay
            error={error}
            render={(props) => {
              const error = props.error as FetchError
              switch (error.code) {
                case 404:
                  return (
                    <div className="flex justify-center gap-4">
                      <div>
                        <IconMoodPuzzled size={64} stroke={1} />
                      </div>
                      <div>
                        <h4 className="text-2xl">Lookup Table not found</h4>
                        <p>Try running simulations to regenerate files.</p>
                      </div>
                    </div>
                  )
                default:
                  return (
                    <div className="text-center">
                      <h2>{error.code}</h2>
                      <div>{error.message}</div>
                    </div>
                  )
              }
            }}
          />
        )}

        {luts.length > 0 && !isLoading && (
          <div>
            <div className="mb-1 text-ui-500">Loaded {luts.length} rows</div>
            <div className="h-192 overflow-y-auto pr-2" ref={scrollRef}>
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

interface FiltersProps {
  mode: string
  filters: Array<{ name: string; value: string }>
  onValueChange: (value: Array<{ name: string; value: string }>) => void
}

const Filters = ({ mode, filters, onValueChange }: FiltersProps) => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "force-keys", gameId, mode],
    queryFn: async () => {
      return await query.gameForceKeys(gameId, mode)
    },
  })

  if (!data || isLoading) {
    return Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-10 mb-4" />
    ))
  }

  const allFilters = Object.keys(data.forceKeys)
  const availableFilters = allFilters.filter((f) => !filters.find((ff) => ff.name === f))
  const availableValuesForFilter = (name: string) => {
    const values = new Set<string>()
    const options = data.forceKeys[name]
    if (!Array.isArray(options)) return ["some weird error occurred, try reloading"]
    for (const val of data.forceKeys[name]) {
      values.add(val)
    }
    return Array.from(values)
  }

  function addFilter() {
    if (availableFilters.length === 0) return

    const newFilters = [...filters]
    newFilters.push({
      name: availableFilters[0],
      value: availableValuesForFilter(availableFilters[0])[0],
    })
    onValueChange(newFilters)
  }

  function changeFilterValue(key: string, value: string) {
    const newFilters = filters.map((f) => {
      if (f.name === key) {
        return { name: f.name, value }
      }
      return f
    })
    onValueChange(newFilters)
  }

  function changeFilter(from: string, to: string) {
    const newFilters = filters.map((f) => {
      if (f.name === from) {
        return { name: to, value: availableValuesForFilter(to)[0] }
      }
      return f
    })
    onValueChange(newFilters)
  }

  function removeFilter(name: string) {
    const newFilters = filters.filter((f) => f.name !== name)
    onValueChange(newFilters)
  }

  return (
    <div>
      {filters.map(({ name, value }) => (
        <div className="flex gap-2 items-end mb-2" key={name}>
          <div className="grid grid-cols-2 gap-2 grow">
            <Select
              label="Property"
              value={name}
              multiple={false}
              onValueChange={(v) => changeFilter(name, v || "")}
            >
              <SelectTrigger className="w-full" />
              <SelectContent>
                {availableFilters.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              label="Value"
              value={value}
              multiple={false}
              onValueChange={(v) => changeFilterValue(name, v || "")}
            >
              <SelectTrigger className="w-full" />
              <SelectContent>
                {availableValuesForFilter(name).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost-destructive"
            isIconButton
            onClick={() => removeFilter(name)}
          >
            <IconTrash />
          </Button>
        </div>
      ))}

      {availableFilters.length > 0 && (
        <Button variant="secondary" className="w-full mt-4" onClick={() => addFilter()}>
          <IconFilter />
          Add Filter
        </Button>
      )}
    </div>
  )
}

interface ActionsProps {
  onJumpToEntry: (id: number) => void
}

const Actions = ({ onJumpToEntry }: ActionsProps) => {
  const [cursor, setCursor] = useState(0)

  function handleJump() {
    onJumpToEntry(Math.max(0, cursor - 1))
  }

  return (
    <div>
      <h5 className="pb-2 mb-2 border-b border-ui-700">Actions</h5>
      <div className="flex gap-2 items-end">
        <NumberInput
          label="Jump to Book ID"
          className="w-full"
          value={cursor}
          onValueChange={(v) => setCursor(v || 0)}
          min={0}
        />
        <Button variant="secondary" onClick={handleJump}>
          Jump
          <IconArrowRight />
        </Button>
      </div>
    </div>
  )
}
