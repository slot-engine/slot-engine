import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/games/")({
  component: GamesPage,
})

function GamesPage() {
  return (
    <div>
      <h1>Games</h1>
    </div>
  )
}
