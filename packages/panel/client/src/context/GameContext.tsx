import { createContext, useContext } from "react"
import type { PropsWithGameId } from "../lib/types"

export interface GameContext {
  gameId: string
}

const GameContext = createContext<GameContext | null>(null)

interface GameProviderProps extends PropsWithGameId {
  children: React.ReactNode
}

export const GameProvider = ({ gameId, children }: GameProviderProps) => {
  return <GameContext.Provider value={{ gameId }}>{children}</GameContext.Provider>
}

export const useGameContext = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider")
  }
  return context
}
