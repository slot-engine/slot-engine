import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/games/$gameId/bet-simulation/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/games/$gameId/bet-simulation/"!</div>
}
