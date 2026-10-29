import { useRef, useState } from "react"
import type { BaseUIEvent } from "@base-ui/react/types"
import { useRseData, type ReelsetEditorReel } from "../context/DataContext"
import { useRseUi, type ShuffleOptions } from "../context/UiContext"
import { shuffleReel } from "../lib/shuffle"
import { SortableSymbol, SymbolDropArea } from "./Symbol"
import { useSortable } from "@dnd-kit/react/sortable"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  IconArrowsShuffle,
  IconCopy,
  IconDots,
  IconGripVertical,
  IconMinus,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "@/components/Menu"
import { Button } from "@/components/Button"
import { NumberInput } from "@/components/NumberInput"

interface SortableReelProps extends React.ComponentPropsWithoutRef<"div"> {
  reelId: number
  index: number
  reel: ReelsetEditorReel
}

export const SortableReel = ({ reelId, index, reel, ...props }: SortableReelProps) => {
  const { reelsState, reelOrderState, duplicateReel } = useRseData()
  const [reels, setReels] = reelsState
  const [, setReelOrder] = reelOrderState

  const { handleDialog, shuffleOptionsState } = useRseUi()
  const [{ spaceBetweenSameSymbols, spacing }, setShuffleOptions] = shuffleOptionsState
  const [shuffleError, setShuffleError] = useState<string | null>(null)

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
    estimateSize: () => 40,
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

  function clearReel(reelId: number) {
    setReels((currentReels) => {
      return { ...currentReels, [reelId]: [] }
    })
  }

  function updateShuffleOptions(options: Partial<ShuffleOptions>) {
    setShuffleOptions((current) => ({ ...current, ...options }))
    setShuffleError(null)
  }

  function handleShuffle(event: BaseUIEvent<React.MouseEvent<HTMLDivElement>>) {
    const result = shuffleReel(reel, spaceBetweenSameSymbols ? spacing : 0)
    if (!result.ok) {
      setShuffleError(result.error)
      event.preventBaseUIHandler()
      return
    }
    setReels((current) => ({ ...current, [reelId]: result.reel }))
  }

  return (
    <div
      {...props}
      ref={ref}
      className="w-36 shrink-0 h-full flex flex-col overflow-clip rounded-2xl bg-ui-900 shadow-card"
    >
      <div className="p-2">
        <div className="flex items-center justify-between">
          <div
            ref={handleRef}
            className="size-10 flex items-center justify-center rounded-lg cursor-grab text-ui-500 transition-colors duration-150 hover:bg-ui-800 hover:text-ui-50"
            title="Click and drag to move"
          >
            <IconGripVertical size={20} stroke={1.5} aria-hidden />
          </div>
          <Menu
            onOpenChange={(open) => {
              if (!open) setShuffleError(null)
            }}
          >
            <MenuTrigger
              title="More options…"
              aria-label="More options"
              render={<Button variant="ghost" isIconButton className="text-ui-500" />}
            >
              <IconDots size={20} stroke={1.5} aria-hidden />
            </MenuTrigger>
            <MenuContent>
              <MenuItem onClick={() => handleDialog(reelId, "addSymbols")}>
                <IconPlus size={20} stroke={1.5} aria-hidden />
                Add Symbols
              </MenuItem>
              <MenuItem onClick={() => handleDialog(reelId, "removeSymbols")}>
                <IconMinus size={20} stroke={1.5} aria-hidden />
                Remove Symbols
              </MenuItem>
              <MenuSubmenu>
                <MenuSubmenuTrigger>
                  <IconArrowsShuffle size={20} stroke={1.5} aria-hidden />
                  Shuffle Symbols
                </MenuSubmenuTrigger>
                <MenuContent className="w-64">
                  <MenuCheckboxItem
                    checked={spaceBetweenSameSymbols}
                    onCheckedChange={(checked) =>
                      updateShuffleOptions({ spaceBetweenSameSymbols: checked })
                    }
                  >
                    Space between same symbols
                  </MenuCheckboxItem>
                  <div
                    // Keeps the menu from treating typed digits as typeahead and arrows as navigation.
                    onKeyDown={(event) => {
                      if (event.key !== "Escape" && event.key !== "Tab") {
                        event.stopPropagation()
                      }
                    }}
                    className="px-2 py-1"
                  >
                    <NumberInput
                      min={1}
                      format={{ maximumFractionDigits: 0 }}
                      value={spacing}
                      onValueChange={(value) => {
                        if (value !== null) updateShuffleOptions({ spacing: value })
                      }}
                      disabled={!spaceBetweenSameSymbols}
                    />
                  </div>
                  <MenuSeparator />
                  <MenuItem onClick={handleShuffle}>
                    <IconArrowsShuffle size={20} stroke={1.5} aria-hidden />
                    Shuffle
                  </MenuItem>
                  {shuffleError && (
                    <div className="px-2 py-1 text-xs text-danger-500" role="alert">
                      {shuffleError}
                    </div>
                  )}
                </MenuContent>
              </MenuSubmenu>
              <MenuSeparator />
              <MenuItem onClick={() => duplicateReel(reelId)}>
                <IconCopy size={20} stroke={1.5} aria-hidden />
                Duplicate Reel
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => clearReel(reelId)}>
                <IconX size={20} stroke={1.5} aria-hidden />
                Clear Reel
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => deleteReel(reelId)}>
                <IconTrash size={20} stroke={1.5} aria-hidden />
                Delete Reel
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <div className="text-xs text-center text-ui-500 tabular">
          Symbols: {reel.length}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="px-2 pb-2 scrollbar-thin h-full overflow-x-hidden overflow-y-auto"
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
