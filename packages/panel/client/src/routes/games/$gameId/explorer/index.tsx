import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/games/$gameId/explorer/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/games/$gameId/explorer/"!</div>
}
