import { useRef } from "react"
import { useRseData, type ReelsetEditorReel } from "../context/DataContext"
import { useRseUi } from "../context/UiContext"
import { SortableSymbol, SymbolDropArea } from "./Symbol"
import { useSortable } from "@dnd-kit/react/sortable"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  IconArrowsShuffle,
  IconDots,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/Menu"
import { Button } from "@/components/Button"

interface SortableReelProps extends React.ComponentPropsWithoutRef<"div"> {
  reelId: number
  index: number
  reel: ReelsetEditorReel
}

export const SortableReel = ({ reelId, index, reel, ...props }: SortableReelProps) => {
  const { reelsState, reelOrderState } = useRseData()
  const [reels, setReels] = reelsState
  const [, setReelOrder] = reelOrderState

  const { handleDialog } = useRseUi()

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
    estimateSize: () => 48,
    overscan: 10,
    gap: 8,
    getItemKey: (itemIdx) => reels[reelId]?.[itemIdx]?.id,
  })

  const symbols = virtualizer.getVirtualItems()

  function deleteReel(reelId: number) {
    setReels((currentReels) => {
      const { [reelId]: _, ...remainingReels } = currentReels
      return remainingReels
    })
    setReelOrder((currentOrder) => currentOrder.filter((id) => id !== reelId))
  }

  function shuffleReel(reelId: number) {
    setReels((currentReels) => {
      const reelToShuffle = currentReels[reelId]
      if (!reelToShuffle) return currentReels

      const shuffledReel = [...reelToShuffle]
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)

      return {
        ...currentReels,
        [reelId]: shuffledReel,
      }
    })
  }

  return (
    <div
      {...props}
      ref={ref}
      className="bg-ui-900 overflow-clip h-content-height flex flex-col"
    >
      <div className="px-4 py-2">
        <div className="flex gap-4 items-center justify-between">
          <div
            ref={handleRef}
            className="py-2 flex justify-center cursor-grab bg-ui-900"
            title="Click and drag to move"
          >
            <IconGripVertical />
          </div>
          <Menu>
            <MenuTrigger
              title="More options..."
              render={<Button variant="ghost" isIconButton size="sm" />}
            >
              <IconDots />
            </MenuTrigger>
            <MenuContent>
              <MenuItem onClick={() => handleDialog(reelId)}>
                <IconPlus />
                Add Symbols
              </MenuItem>
              <MenuItem onClick={() => shuffleReel(reelId)}>
                <IconArrowsShuffle />
                Shuffle Symbols
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => deleteReel(reelId)}>
                <IconTrash />
                Delete Reel
              </MenuItem>
            </MenuContent>
          </Menu>
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
