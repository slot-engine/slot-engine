import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useGameContext } from "../../../context/GameContext"
import { useQuery } from "@tanstack/react-query"
import { query } from "@/lib/queries"
import { ErrorDisplay } from "@/components/Error"
import { Skeleton } from "@/components/Skeleton"
import type { State } from "@/lib/types"
import type { APIGameGetReelSetResponse } from "../../../../../server/types"

export type ReelsetEditorReel = Array<{ id: string; symbol: string }>

const RseDataContext = createContext<RseDataContext | null>(null)

interface RseDataContext {
  reelSets: {
    path: string
    name: string
  }[]
  colorsState: State<Record<string, string>>
  activeReelsetState: State<string>
  reelsState: State<Record<number, ReelsetEditorReel>>
  reelOrderState: State<number[]>
  previousReels: React.RefObject<Record<number, ReelsetEditorReel>>
  addReel: () => void
  options: APIGameGetReelSetResponse["options"]
}

export function useRseData() {
  const context = useContext(RseDataContext)

  if (!context) {
    throw new Error("useRseDataContext must be used within an RseDataProvider")
  }

  return context
}

interface ReelsetEditorProviderProps {
  reelSets: {
    path: string
    name: string
  }[]
  children: React.ReactNode
}

export function RseDataProvider({ reelSets, children }: ReelsetEditorProviderProps) {
  const { gameId } = useGameContext()

  const [activeRs, setActiveRs] = useState(reelSets[0]?.name || "")

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "reel-sets", gameId, activeRs],
    queryFn: async () => {
      return await query.gameReelSet(gameId, activeRs)
    },
    refetchOnWindowFocus: false,
  })

  const [reels, setReels] = useState<Record<number, ReelsetEditorReel>>({})
  const [reelOrder, setReelOrder] = useState<number[]>([])
  const previousReels = useRef<Record<number, ReelsetEditorReel>>({})
  const [colors, setColors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!data) return
    setReels(Object.fromEntries(data.reelSet.reels.map((r, idx) => [idx, r])))
    setReelOrder(data.reelSet.reels.map((_, idx) => idx))
    setColors(data.reelSet.colors)
  }, [data])

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="flex gap-4 p-8">
        <Skeleton className="h-192 w-24" />
        <Skeleton className="h-192 w-24" />
        <Skeleton className="h-192 w-24" />
        <Skeleton className="h-192 w-24" />
        <Skeleton className="h-192 w-24" />
        <Skeleton className="h-192 w-24" />
      </div>
    )
  }

  function addReel() {
    const newIndex = Object.keys(reels).length
    setReels((r) => ({
      ...r,
      [newIndex]: [],
    }))
    setReelOrder((order) => [...order, newIndex])
    previousReels.current = {
      ...reels,
      [newIndex]: [],
    }
  }

  const context: RseDataContext = {
    reelSets,
    activeReelsetState: [activeRs, setActiveRs],
    colorsState: [colors, setColors],
    reelOrderState: [reelOrder, setReelOrder],
    previousReels,
    reelsState: [reels, setReels],
    addReel,
    options: data.options,
  }

  return <RseDataContext.Provider value={context}>{children}</RseDataContext.Provider>
}
