import { createContext, useContext, useState } from "react"
import { useRseData } from "./DataContext"
import type { State } from "@/lib/types"

interface RseUiContext {
  dialogState: State<boolean>
  symbolCountsState: State<Record<string, number>>
  activeReelState: State<number | null>
  insertPosState: State<number | null>
  handleDialog: (reelId: number) => void
  updateSymbolCount: (symbol: string, count: number) => void
  confirmSymbols: (mode: "prepend" | "append") => void
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [symbolCounts, setSymbolCounts] = useState<Record<string, number>>({})
  const [activeReel, setActiveReel] = useState<number | null>(null)
  const [insertPos, setInsertPos] = useState<number | null>(null)

  function handleDialog(reelId: number) {
    setActiveReel(reelId)
    setDialogOpen(true)
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
    setDialogOpen(false)
  }

  const context: RseUiContext = {
    dialogState: [dialogOpen, setDialogOpen],
    symbolCountsState: [symbolCounts, setSymbolCounts],
    activeReelState: [activeReel, setActiveReel],
    insertPosState: [insertPos, setInsertPos],
    handleDialog,
    updateSymbolCount,
    confirmSymbols,
  }

  return <RseUiContext.Provider value={context}>{children}</RseUiContext.Provider>
}
