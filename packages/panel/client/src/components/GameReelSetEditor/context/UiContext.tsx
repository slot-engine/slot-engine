import { createContext, useContext, useState } from "react"
import { useRseData } from "./DataContext"
import type { State } from "@/lib/types"

export interface ShuffleOptions {
  spaceBetweenSameSymbols: boolean
  spacing: number
}

export type RseDialog = "addSymbols" | "removeSymbols"

interface RseUiContext {
  dialogState: State<RseDialog | null>
  symbolCountsState: State<Record<string, number>>
  symbolsToRemoveState: State<string[]>
  activeReelState: State<number | null>
  insertPosState: State<number | null>
  shuffleOptionsState: State<ShuffleOptions>
  handleDialog: (reelId: number, dialog: RseDialog) => void
  updateSymbolCount: (symbol: string, count: number) => void
  confirmSymbols: (mode: "prepend" | "append") => void
  confirmRemoveSymbols: () => void
}

const RseUiContext = createContext<RseUiContext | null>(null)

export function useRseUi() {
  const context = useContext(RseUiContext)

  if (!context) {
    throw new Error("useRseUi must be used within a RseUiProvider")
  }

  return context
}

export const RseUiProvider = ({ children }: React.PropsWithChildren) => {
  const { reelsState } = useRseData()
  const [reels, setReels] = reelsState

  const [dialog, setDialog] = useState<RseDialog | null>(null)
  const [symbolCounts, setSymbolCounts] = useState<Record<string, number>>({})
  const [symbolsToRemove, setSymbolsToRemove] = useState<string[]>([])
  const [activeReel, setActiveReel] = useState<number | null>(null)
  const [insertPos, setInsertPos] = useState<number | null>(null)
  const [shuffleOptions, setShuffleOptions] = useState<ShuffleOptions>({
    spaceBetweenSameSymbols: false,
    spacing: 1,
  })

  function handleDialog(reelId: number, dialog: RseDialog) {
    setActiveReel(reelId)
    setDialog(dialog)
  }

  function updateSymbolCount(symbol: string, count: number) {
    setSymbolCounts((current) => {
      return { ...current, [symbol]: count }
    })
  }

  function confirmSymbols(mode: "prepend" | "append") {
    const reelId = activeReel
    const symbolIdx = insertPos
    if (reelId === null) return

    const newSymbols: Array<{ id: string; symbol: string }> = []
    for (const [symbol, count] of Object.entries(symbolCounts)) {
      for (let i = 0; i < count; i++) {
        newSymbols.push({ id: crypto.randomUUID(), symbol })
      }
    }

    let reel = []

    if (symbolIdx !== null) {
      if (mode === "prepend") {
        reel = [
          ...(reels[reelId] || []).slice(0, symbolIdx),
          ...newSymbols,
          ...(reels[reelId] || []).slice(symbolIdx),
        ]
      } else {
        reel = [
          ...(reels[reelId] || []).slice(0, symbolIdx + 1),
          ...newSymbols,
          ...(reels[reelId] || []).slice(symbolIdx + 1),
        ]
      }
    } else {
      if (mode === "prepend") {
        reel = [...newSymbols, ...(reels[reelId] || [])]
      } else {
        reel = [...(reels[reelId] || []), ...newSymbols]
      }
    }

    setReels((current) => {
      return { ...current, [reelId]: reel }
    })

    setActiveReel(null)
    setInsertPos(null)
    setSymbolCounts({})
    setDialog(null)
  }

  function confirmRemoveSymbols() {
    const reelId = activeReel
    if (reelId === null) return

    setReels((current) => {
      return {
        ...current,
        [reelId]: (current[reelId] || []).filter(
          (item) => !symbolsToRemove.includes(item.symbol),
        ),
      }
    })

    setActiveReel(null)
    setDialog(null)
  }

  const context: RseUiContext = {
    dialogState: [dialog, setDialog],
    symbolCountsState: [symbolCounts, setSymbolCounts],
    symbolsToRemoveState: [symbolsToRemove, setSymbolsToRemove],
    activeReelState: [activeReel, setActiveReel],
    insertPosState: [insertPos, setInsertPos],
    shuffleOptionsState: [shuffleOptions, setShuffleOptions],
    handleDialog,
    updateSymbolCount,
    confirmSymbols,
    confirmRemoveSymbols,
  }

  return <RseUiContext.Provider value={context}>{children}</RseUiContext.Provider>
}
