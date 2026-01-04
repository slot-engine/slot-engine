import { createContext, useContext } from "react"
import type { PropsWithGameId } from "../lib/types"
import { useQuery } from "@tanstack/react-query"
import { query } from "../lib/queries"
import type { APIGameInfoResponse } from "../../../server/types"
import { ErrorDisplay } from "../components/Error"
import { Loading } from "../components/Loading"

export interface GameContext {
  gameId: string
  game: APIGameInfoResponse
  isLoading: boolean
  error: Error | null
}

const GameContext = createContext<GameContext | null>(null)

interface GameProviderProps extends PropsWithGameId {
  children: React.ReactNode
}

export const GameProvider = ({ gameId, children }: GameProviderProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "info", gameId],
    queryFn: async () => {
      return await query.gameInfo(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  return (
    <GameContext.Provider value={{ gameId, game: data, isLoading, error }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGameContext = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider")
  }
  return context
}
