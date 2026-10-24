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
        <div className="flex gap-0.5 overflow-x-auto">
          {reelOrder.map((reel, i) => (
            <SortableReel key={reel} reelId={reel} index={i} reel={reels[reel]} />
          ))}
          <div
            onClick={() => addReel()}
            className="min-w-36 min-h-content-height bg-ui-900 hover:bg-ui-800 flex flex-col justify-center items-center gap-2 border-2 border-ui-700 border-dashed cursor-pointer"
          >
            <IconPlus />
            Add Reel
          </div>
        </div>
      </DragDropProvider>

      <Dialog
        open={dialog === "addSymbols"}
        onOpenChange={(open) => setDialog(open ? "addSymbols" : null)}
      >
        <DialogContent>
          <DialogTitle>Add Reel Symbols</DialogTitle>
          <DialogDescription>
            The selected symbols will be added to reel {(activeReel ?? 0) + 1}.
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-x-8">
            {options.symbols.map((sym) => (
              <div className="flex gap-3 items-center mb-2" key={sym}>
                <div className="text-lg w-16">{sym}</div>
                <NumberInput
                  defaultValue={0}
                  value={symbolCounts[sym]}
                  onValueChange={(v) => updateSymbolCount(sym, v || 0)}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => confirmSymbols("prepend")}>Add Before</Button>
            <NumberInput
              placeholder="Symbol Index"
              value={insertPos}
              onValueChange={(v) => setInsertPos(v)}
              className="max-w-64"
            />
            <Button onClick={() => confirmSymbols("append")}>Add After</Button>
          </div>
          <div className="text-sm mt-2 text-ui-500">
            If no symbol index is given, the symbols will be placed at the start or end of
            the reel.
          </div>
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
            All symbols of the checked types will be removed from reel{" "}
            {(activeReel ?? 0) + 1}.
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
          <div className="mt-4 flex">
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
