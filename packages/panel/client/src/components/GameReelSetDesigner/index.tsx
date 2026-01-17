import { useQuery } from "@tanstack/react-query"
import { query } from "../../lib/queries"
import { useGameContext } from "../../context/GameContext"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs"
import { useEffect, useRef, useState } from "react"
import { DragDropProvider } from "@dnd-kit/react"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useSortable } from "@dnd-kit/react/sortable"
import { arrayMove, move } from "@dnd-kit/helpers"
import { IconEdit, IconGripHorizontal } from "@tabler/icons-react"

export const ReelSetDesigner = () => {
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
      <>
        <Skeleton className="h-32" />
        <Skeleton className="h-32 mt-4" />
        <Skeleton className="h-32 mt-4" />
      </>
    )
  }

  return (
    <Tabs className="grid grid-cols-[16rem_auto] gap-4 items-start" defaultValue="start">
      <TabsList unstyled className="border-r border-ui-700 w-full sticky top-16">
        <TabsTrigger unstyled value="start"></TabsTrigger>
        {data.reelSets.map((rs) => (
          <TabsTrigger
            key={rs.name}
            unstyled
            className="w-full rounded-l-lg text-left truncate px-4 py-2 hover:bg-ui-800 data-active:bg-ui-700"
            value={rs.path}
          >
            {rs.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {data.reelSets.map((rs) => (
        <TabsContent value={rs.path} className="overflow-x-auto" key={rs.name}>
          <ReelSetEditor rsName={rs.name} />
        </TabsContent>
      ))}
      <TabsContent value="start" className="text-center">
        <IconEdit size={64} stroke={1} className="mx-auto" />
        <div className="text-xl mt-4">Select a reel set to start editing.</div>
        <div className="max-w-lg mx-auto mt-4">
          <span className="text-orange-500">
            There may be a heavy performance hit when loading a reel set editor.
          </span>
          <br />
          This is due to large drag-and-drop lists. Please wait a few seconds until the
          app becomes responsive.
        </div>
      </TabsContent>
    </Tabs>
  )
}

const ReelSetEditor = ({ rsName }: { rsName: string }) => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "reel-sets", gameId, rsName],
    queryFn: async () => {
      return await query.gameReelSet(gameId, rsName)
    },
    refetchOnWindowFocus: false,
  })

  const [reels, setReels] = useState<Record<number, string[]>>({})
  const [reelOrder, setReelOrder] = useState<number[]>([])
  const previousReels = useRef<Record<number, string[]>>({})

  useEffect(() => {
    if (!data || !data.reels.length) return
    setReels(Object.fromEntries(data.reels.map((r, idx) => [idx, r])))
    setReelOrder(data.reels.map((_, idx) => idx))
  }, [data])

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        <Skeleton className="h-128" />
        <Skeleton className="h-128" />
        <Skeleton className="h-128" />
        <Skeleton className="h-128" />
        <Skeleton className="h-128" />
      </div>
    )
  }

  console.log(reels)

  return (
    <DragDropProvider
      onDragStart={() => {
        previousReels.current = reels
      }}
      onDragEnd={(event) => {
        const { source, target } = event.operation

        if (event.canceled) {
          if (source?.type === "item") {
            setReels(previousReels.current)
          }
          return
        }

        if (source?.type === "symbol") {
          setReels((reels) => move(reels, event))
        }

        if (source?.type === "reel") {
          setReelOrder((reels) => move(reels, event))
        }
      }}
    >
      <div className="flex gap-4 overflow-x-auto">
        {reelOrder.map((reel) => (
          <SortableReel key={reel} index={reel} reel={reels[reel]} />
        ))}
      </div>
    </DragDropProvider>
  )
}

interface SortableReelProps extends React.ComponentPropsWithoutRef<"div"> {
  index: number
  reel: string[]
}

const SortableReel = ({ index, reel, ...props }: SortableReelProps) => {
  const handleRef = useRef<HTMLDivElement>(null)

  const { ref, isDragging } = useSortable({
    id: index,
    index,
    type: "reel",
    collisionPriority: CollisionPriority.Low,
    accept: ["symbol", "reel"],
    handle: handleRef,
  })

  return (
    <div
      {...props}
      ref={ref}
      data-dragging={isDragging}
      className="bg-ui-900 rounded-lg overflow-clip"
    >
      <div className="p-4">
        <div ref={handleRef} className="flex justify-center cursor-grab bg-ui-900">
          <IconGripHorizontal />
        </div>
      </div>
      <div className="p-4 pt-0 flex flex-col gap-2 max-h-196 scrollbar-thin overflow-x-hidden overflow-y-auto">
        {reel.map((sym, sidx) => (
          <SortableSymbol
            key={`${index}-${sidx}`}
            id={`${index}-${sidx}`}
            index={sidx}
            ridx={index}
            symbolId={sym}
          />
        ))}
      </div>
    </div>
  )
}

interface SortableSymbolProps extends React.ComponentPropsWithoutRef<"div"> {
  index: number
  ridx: number
  symbolId: string
}

const SortableSymbol = ({ id, index, symbolId, ridx, ...props }: SortableSymbolProps) => {
  const { ref, isDragging } = useSortable({
    id: id!,
    index,
    type: "symbol",
    accept: "symbol",
    group: ridx,
  })

  return (
    <div
      {...props}
      ref={ref}
      data-dragging={isDragging}
      className="relative cursor-grab w-16 min-h-16 flex items-center justify-center bg-ui-800 rounded-sm border border-ui-700"
    >
      <span className="text-xl">{symbolId}</span>
      <span className="absolute text-xs top-0.5 left-1 text-ui-100">{index}</span>
    </div>
  )
}
