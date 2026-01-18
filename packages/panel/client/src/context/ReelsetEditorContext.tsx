import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useGameContext } from "./GameContext"
import { useQuery } from "@tanstack/react-query"
import { query } from "@/lib/queries"
import { ErrorDisplay } from "@/components/Error"
import { Skeleton } from "@/components/Skeleton"
import type { State } from "@/lib/types"

export type ReelsetEditorReel = Array<{ id: string; symbol: string }>

const EditorContext = createContext<EditorContext | null>(null)

interface EditorContext {
  reelSets: {
    path: string
    name: string
  }[]
  colors: Record<string, string>
  activeReelsetName: State<string>
  reelsState: State<Record<number, ReelsetEditorReel>>
  reelOrderState: State<number[]>
  previousReels: React.RefObject<Record<number, ReelsetEditorReel>>
  addReel: () => void
}

export function useEditorContext() {
  const context = useContext(EditorContext)

  if (!context) {
    throw new Error("useEditorContext must be used within an EditorContext.Provider")
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

export function ReelsetEditorProvider({
  reelSets,
  children,
}: ReelsetEditorProviderProps) {
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

  useEffect(() => {
    if (!data || !data.reels.length) return
    setReels(Object.fromEntries(data.reels.map((r, idx) => [idx, r])))
    setReelOrder(data.reels.map((_, idx) => idx))
  }, [data])

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="flex gap-4 mt-8">
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
    setReels((r) => ({ ...r, [newIndex]: [] }))
    setReelOrder((order) => [...order, newIndex])
    previousReels.current = { ...reels, [newIndex]: [] }
  }

  const context: EditorContext = {
    reelSets,
    activeReelsetName: [activeRs, setActiveRs],
    colors: data.colors,
    reelOrderState: [reelOrder, setReelOrder],
    previousReels,
    reelsState: [reels, setReels],
    addReel,
  }

  return <EditorContext.Provider value={context}>{children}</EditorContext.Provider>
}
