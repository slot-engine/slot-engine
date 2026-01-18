import { useRef } from "react"
import { DragDropProvider } from "@dnd-kit/react"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useSortable } from "@dnd-kit/react/sortable"
import { move } from "@dnd-kit/helpers"
import { IconDragDrop, IconGripHorizontal, IconPlus } from "@tabler/icons-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/cn"
import { useEditorContext, type ReelsetEditorReel } from "@/context/ReelsetEditorContext"

export const ReelSetDesigner = () => {
  const { addReel, previousReels, reelsState, reelOrderState } = useEditorContext()
  const [reels, setReels] = reelsState
  const [reelOrder, setReelOrder] = reelOrderState

  return (
    <DragDropProvider
      onDragStart={() => {
        previousReels.current = reels
      }}
      onDragOver={(event) => {
        const { source, target } = event.operation

        if (source?.type === "reel") return

        if (source?.type === "symbol") {
          if (target?.type && String(target.id).includes("dropzone")) {
            setReels((currentReels) => {
              const { reels: reelsWithoutItem, item } = findAndRemoveItem(
                currentReels,
                source.id,
              )
              if (!item) return currentReels

              const dropzoneReelId = parseDropzoneId(target.id)!
              return {
                ...reelsWithoutItem,
                [dropzoneReelId]: [...reelsWithoutItem[dropzoneReelId], item],
              }
            })
          } else {
            setReels((currentReels) => move(currentReels, event))
          }
        }
      }}
      onDragEnd={(event) => {
        const { source, target } = event.operation

        if (event.canceled) {
          if (source?.type == "symbol") {
            setReels(previousReels.current)
          }
          return
        }

        if (source?.type === "reel") {
          setReelOrder((reels) => move(reels, event))
          return
        }
      }}
    >
      <div className="flex gap-0.5 overflow-x-auto">
        {reelOrder.map((reel, i) => (
          <SortableReel key={reel} reelId={reel} index={i} reel={reels[reel]} />
        ))}
        <div
          onClick={() => addReel()}
          className="min-w-28 bg-ui-900 hover:bg-ui-800 flex flex-col justify-center items-center gap-2 border-2 border-ui-700 border-dashed cursor-pointer"
        >
          <IconPlus />
          Add Reel
        </div>
      </div>
    </DragDropProvider>
  )
}

interface SortableReelProps extends React.ComponentPropsWithoutRef<"div"> {
  reelId: number
  index: number
  reel: ReelsetEditorReel
}

const SortableReel = ({ reelId, index, reel, ...props }: SortableReelProps) => {
  const { reelsState } = useEditorContext()
  const [reels] = reelsState

  const handleRef = useRef<HTMLDivElement>(null)

  const { ref } = useSortable({
    id: reelId,
    index,
    type: "reel",
    collisionPriority: CollisionPriority.Low,
    accept: ["reel"],
    handle: handleRef,
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: reel.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 78,
    overscan: 10,
    gap: 8,
    getItemKey: (itemIdx) => reels[reelId]?.[itemIdx]?.id,
  })

  const symbols = virtualizer.getVirtualItems()

  return (
    <div
      {...props}
      ref={ref}
      className="bg-ui-900 overflow-clip h-content-height flex flex-col"
    >
      <div className="px-4 py-2">
        <div ref={handleRef} className="py-2 flex justify-center cursor-grab bg-ui-900">
          <IconGripHorizontal />
        </div>
        <div className="text-xs text-center">Symbols: {reel.length}</div>
      </div>
      <div
        ref={scrollRef}
        className="w-28 p-4 pt-0 scrollbar-thin h-full overflow-x-hidden overflow-y-auto"
      >
        {reel.length === 0 ? (
          <SymbolDropArea reelId={reelId} />
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              minHeight: "100%",
              width: "100%",
              position: "relative",
            }}
          >
            <div
              className="flex flex-col gap-2"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${symbols[0]?.start ?? 0}px)`,
              }}
            >
              {symbols.map((virtualRow) => {
                const sidx = virtualRow.index
                const sym = reel[sidx]
                return (
                  <SortableSymbol
                    key={virtualRow.key}
                    id={sym.id}
                    index={sidx}
                    reelId={reelId}
                    symbolId={sym.symbol}
                    style={{
                      height: `${virtualRow.size}px`,
                      top: `${virtualRow.start}px`,
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SortableSymbolProps extends React.ComponentPropsWithoutRef<"div"> {
  index: number
  reelId: number
  symbolId: string
}

const SortableSymbol = ({
  id,
  index,
  symbolId,
  reelId,
  className,
  ...props
}: SortableSymbolProps) => {
  const { colors } = useEditorContext()

  const { ref } = useSortable({
    id: id!,
    index,
    type: "symbol",
    accept: "symbol",
    group: reelId,
  })

  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "cursor-grab size-20 bg-ui-800 rounded-sm border border-ui-700",
        "data-[dnd-dragging=true]:opacity-90 data-[dnd-dragging=true]:animate-wiggle",
        className,
      )}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="text-xl">{symbolId}</span>
        <span className="absolute text-xs top-0.5 left-1 text-ui-100">{index}</span>
        <span
          className="absolute w-1 h-[calc(100%-0.5rem)] top-1 right-1 rounded"
          style={{ backgroundColor: colors[symbolId] }}
        />
      </div>
    </div>
  )
}

interface SymbolDropAreaProps extends React.ComponentPropsWithoutRef<"div"> {
  reelId: number
}

const SymbolDropArea = ({ reelId }: SymbolDropAreaProps) => {
  const { ref } = useSortable({
    id: `dropzone-${reelId}`,
    index: 0,
    type: "symbol",
    accept: "symbol",
    group: reelId,
  })

  return (
    <div
      ref={ref}
      className="py-8 h-128 flex flex-col justify-center items-center gap-2 text-center border border-ui-700 border-dashed rounded-sm"
    >
      <IconDragDrop />
      Drop Symbols here
    </div>
  )
}

function findAndRemoveItem(
  reels: Record<number, ReelsetEditorReel>,
  itemId: unknown,
): {
  reels: Record<number, ReelsetEditorReel>
  item: { id: string; symbol: string } | null
} {
  for (const [reelId, reel] of Object.entries(reels)) {
    const index = reel.findIndex((item) => item.id === itemId)
    if (index !== -1) {
      const item = reel[index]
      const newReel = [...reel.slice(0, index), ...reel.slice(index + 1)]
      return {
        reels: { ...reels, [reelId]: newReel },
        item,
      }
    }
  }
  return { reels, item: null }
}

function parseDropzoneId(id: unknown): number | null {
  if (typeof id === "string" && id.startsWith("dropzone-")) {
    return Number(id.replace("dropzone-", ""))
  }
  return null
}
