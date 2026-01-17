import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/games/$gameId/reelset-designer/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/games/$gameId/reelset-designer/"!</div>
}
