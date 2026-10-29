import { Button } from "@/components/Button"
import { ColorPicker } from "@/components/ColorPicker"
import { ErrorDisplay } from "@/components/Error"
import { ReelSetDesigner } from "@/components/GameReelSetEditor"
import { PageContent } from "@/components/Page"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/Select"
import { Skeleton } from "@/components/Skeleton"
import { useGameContext } from "@/context/GameContext"
import {
  RseDataProvider,
  useRseData,
} from "@/components/GameReelSetEditor/context/DataContext"
import { mutation, query } from "@/lib/queries"
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { RseUiProvider } from "@/components/GameReelSetEditor/context/UiContext"

export const Route = createFileRoute("/games/$gameId/reelset-designer/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "reel-sets", gameId],
    queryFn: async () => {
      return await query.gameReelSets(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="px-6 py-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 mt-4 rounded-2xl" />
        <Skeleton className="h-32 mt-4 rounded-2xl" />
      </div>
    )
  }

  if (data.reelSets.length === 0) {
    return (
      <PageContent>
        <div className="p-8 text-center text-ui-500">
          No reel sets found in this game. Ensure they are named starting with “reels_”.
        </div>
      </PageContent>
    )
  }

  return (
    <RseDataProvider reelSets={data.reelSets}>
      <RseUiProvider>
        <PageContent sidebar={<Sidebar />}>
          <ReelSetDesigner />
        </PageContent>
      </RseUiProvider>
    </RseDataProvider>
  )
}

const Sidebar = () => {
  const { gameId } = useGameContext()

  const {
    reelSets,
    activeReelsetState,
    colorsState,
    reelsState,
    reelOrderState,
    options,
  } = useRseData()
  const [activeReelset, setActiveReelset] = activeReelsetState
  const [reels] = reelsState
  const [colors] = colorsState
  const [reelOrder] = reelOrderState

  const updateMutation = useMutation({
    mutationKey: ["game", "save-reelset", gameId, activeReelset],
    mutationFn: async () => {
      const orderedReels = reelOrder.map((idx) => reels[idx] || [])

      return await mutation.saveReelSet(gameId, activeReelset, {
        reels: orderedReels.map((r) => r.map((s) => s.symbol)),
        colors,
      })
    },
  })

  const isLoading = updateMutation.isPending

  return (
    <div>
      <h3 className="mb-4">Reel Set Designer</h3>
      <Select
        multiple={false}
        value={activeReelset}
        onValueChange={(v) => setActiveReelset(v || "")}
        label="Reel Set to edit"
      >
        <SelectTrigger />
        <SelectContent>
          {reelSets.map((rs) => (
            <SelectItem key={rs.name} value={rs.name}>
              {rs.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mt-6 mb-1.5 text-ui-100">Color Settings</div>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(colors).map(([key, color]) => (
          <SymbolColor key={key} symbol={key} color={color} />
        ))}
      </div>
      <Button
        className="mt-6 w-full"
        disabled={isLoading}
        onClick={() => updateMutation.mutate()}
      >
        {isLoading ? (
          <IconLoader2 size={20} stroke={1.5} className="animate-spin" aria-hidden />
        ) : (
          <IconDeviceFloppy size={20} stroke={1.5} aria-hidden />
        )}
        Save Reels & Settings
      </Button>
      <div className="mt-6 pt-6 border-t border-ui-700">
        <h4 className="mb-1">Advanced Information</h4>
        <div className="mb-3 text-ui-500">Symbol Counts</div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {reelOrder.map((reelId, position) => {
            const counts: Record<string, number> = {}
            options.symbols.forEach((s) => (counts[s] = 0))
            reels[reelId]?.forEach((s) => {
              counts[s.symbol] = (counts[s.symbol] || 0) + 1
            })
            return (
              <div key={reelId} className="text-xs min-w-12">
                <div className="mb-1 text-ui-100 whitespace-nowrap">
                  Reel {position + 1}:
                </div>
                <div>
                  {Object.entries(counts).map(([symbol, count]) => (
                    <div key={symbol} className="font-mono">
                      <span style={{ color: colors[symbol] }}>{symbol}</span>: {count}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SymbolColor = ({ symbol, color }: { symbol: string; color: string }) => {
  const { colorsState } = useRseData()
  const [colors, setColors] = colorsState

  return (
    <Popover>
      <PopoverTrigger className="h-10 pl-3 pr-2 flex gap-2 items-center justify-between rounded-lg bg-ui-800 cursor-pointer transition-colors duration-150 hover:bg-ui-700 data-popup-open:bg-ui-700">
        <span className="truncate" translate="no">
          {symbol}
        </span>
        <span
          className="size-6 shrink-0 rounded-md outline-1 -outline-offset-1 outline-[rgb(255_255_255/0.1)]"
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent>
        <ColorPicker
          color={colors[symbol]}
          onChange={(c) => setColors((v) => ({ ...v, [symbol]: c.hex }))}
        />
      </PopoverContent>
    </Popover>
  )
}
