import { Button } from "@/components/Button"
import { ColorPicker } from "@/components/ColorPicker"
import { ErrorDisplay } from "@/components/Error"
import { ReelSetDesigner } from "@/components/GameReelSetDesigner"
import { PageContent } from "@/components/Page"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/Select"
import { Skeleton } from "@/components/Skeleton"
import { useGameContext } from "@/context/GameContext"
import { ReelsetEditorProvider, useEditorContext } from "@/context/ReelsetEditorContext"
import { query } from "@/lib/queries"
import { IconDeviceFloppy } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

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
      <div className="pt-8">
        <Skeleton className="h-32" />
        <Skeleton className="h-32 mt-4" />
        <Skeleton className="h-32 mt-4" />
      </div>
    )
  }

  return (
    <ReelsetEditorProvider reelSets={data.reelSets}>
      <PageContent sidebar={<Sidebar />} classNames={{ content: "py-0 pl-0" }}>
        <ReelSetDesigner />
      </PageContent>
    </ReelsetEditorProvider>
  )
}

const Sidebar = () => {
  const { reelSets, activeReelsetState, colorsState } = useEditorContext()
  const [activeReelset, setActiveReelset] = activeReelsetState
  const [colors] = colorsState

  return (
    <div>
      <div className="text-sm px-2 py-1 bg-yellow-950 rounded inline-block mb-2">
        Experimental
      </div>
      <h2 className="mb-2">Reel Set Designer</h2>
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
      <div className="mt-8 mb-2">Color Settings</div>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(colors).map(([key, color]) => (
          <SymbolColor key={key} symbol={key} color={color} />
        ))}
      </div>
      <Button className="mt-8">
        <IconDeviceFloppy />
        Save Reels & Settings
      </Button>
    </div>
  )
}

const SymbolColor = ({ symbol, color }: { symbol: string; color: string }) => {
  const { colorsState } = useEditorContext()
  const [colors, setColors] = colorsState

  return (
    <Popover>
      <PopoverTrigger className="cursor-pointer flex gap-2 items-center justify-between p-2 bg-ui-900 hover:bg-ui-800 border border-ui-700 rounded-lg">
        <div>{symbol}</div>
        <div className="size-6 rounded-sm" style={{ backgroundColor: color }}></div>
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
