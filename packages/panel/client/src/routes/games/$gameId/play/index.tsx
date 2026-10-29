import { createFileRoute } from "@tanstack/react-router"
import { GamePlay } from "@/components/GamePlay"

export const Route = createFileRoute("/games/$gameId/play/")({
  component: GamePlay,
})
