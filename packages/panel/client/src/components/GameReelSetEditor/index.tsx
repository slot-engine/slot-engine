import { DragDropProvider } from "@dnd-kit/react"
import { move } from "@dnd-kit/helpers"
import { IconPlus } from "@tabler/icons-react"
import { useRseData, type ReelsetEditorReel } from "./context/DataContext"
import { Button } from "../Button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../Dialog"
import { NumberInput } from "../NumberInput"
import { Checkbox } from "../Checkbox"
import { useRseUi } from "./context/UiContext"
import { SortableReel } from "./components/Reel"

export const ReelSetDesigner = () => {
  const { addReel, previousReels, reelsState, reelOrderState, options } = useRseData()
  const [reels, setReels] = reelsState
  const [reelOrder, setReelOrder] = reelOrderState

  const {
    dialogState,
    symbolCountsState,
    symbolsToRemoveState,
    insertPosState,
    activeReelState,
    updateSymbolCount,
    confirmSymbols,
    confirmRemoveSymbols,
  } = useRseUi()
  const [dialog, setDialog] = dialogState
  const [symbolCounts] = symbolCountsState
  const [symbolsToRemove, setSymbolsToRemove] = symbolsToRemoveState
  const [insertPos, setInsertPos] = insertPosState
  const [activeReel] = activeReelState

  const activeReelSymbols = activeReel !== null ? (reels[activeReel] ?? []) : []
  const activeReelNumber = activeReel !== null ? reelOrder.indexOf(activeReel) + 1 : 1

  return (
    <>
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
          const { source } = event.operation

          if (event.canceled) {
            if (source?.type == "symbol") {
              setReels(previousReels.current)
            }
          }

          if (source?.type === "reel") {
            setReelOrder((reels) => move(reels, event))
          }
        }}
      >
        <div className="flex gap-2 overflow-x-auto h-[calc(var(--spacing-content-height)-3rem)]">
          {reelOrder.map((reel, i) => (
            <SortableReel key={reel} reelId={reel} index={i} reel={reels[reel]} />
          ))}
          <button
            type="button"
            onClick={() => addReel()}
            className="press w-36 shrink-0 h-full flex flex-col justify-center items-center gap-2 rounded-2xl border border-dashed border-ui-700 text-ui-500 cursor-pointer hover:bg-ui-900 hover:text-ui-50"
          >
            <IconPlus size={20} stroke={1.5} aria-hidden />
            Add Reel
          </button>
        </div>
      </DragDropProvider>

      <Dialog
        open={dialog === "addSymbols"}
        onOpenChange={(open) => setDialog(open ? "addSymbols" : null)}
      >
        <DialogContent>
          <DialogTitle>Add Reel Symbols</DialogTitle>
          <DialogDescription>
            The selected symbols will be added to reel {activeReelNumber}.
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-x-8">
            {options.symbols.map((sym) => (
              <div className="flex gap-3 items-center mb-2" key={sym}>
                <div className="w-12 shrink-0 text-base font-medium" translate="no">
                  {sym}
                </div>
                <NumberInput
                  defaultValue={0}
                  value={symbolCounts[sym]}
                  onValueChange={(v) => updateSymbolCount(sym, v || 0)}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 flex gap-2 border-t border-ui-700">
            <Button onClick={() => confirmSymbols("prepend")}>Add Before</Button>
            <NumberInput
              placeholder="Symbol Index"
              value={insertPos}
              onValueChange={(v) => setInsertPos(v)}
              className="max-w-64"
            />
            <Button onClick={() => confirmSymbols("append")}>Add After</Button>
          </div>
          <p className="text-xs mt-2 text-ui-500">
            If no symbol index is given, the symbols will be placed at the start or end of
            the reel.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "removeSymbols"}
        onOpenChange={(open) => setDialog(open ? "removeSymbols" : null)}
        onOpenChangeComplete={(open) => {
          if (!open) setSymbolsToRemove([])
        }}
      >
        <DialogContent>
          <DialogTitle>Remove Reel Symbols</DialogTitle>
          <DialogDescription>
            All symbols of the checked types will be removed from reel {activeReelNumber}.
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
            {options.symbols.map((sym) => (
              <Checkbox
                key={sym}
                label={`${sym} (${activeReelSymbols.filter((item) => item.symbol === sym).length})`}
                checked={symbolsToRemove.includes(sym)}
                onCheckedChange={(checked) =>
                  setSymbolsToRemove((current) =>
                    checked ? [...current, sym] : current.filter((s) => s !== sym),
                  )
                }
              />
            ))}
          </div>
          <div className="mt-4 pt-4 flex border-t border-ui-700">
            <Button
              variant="destructive"
              disabled={symbolsToRemove.length === 0}
              onClick={confirmRemoveSymbols}
            >
              Remove Symbols
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
