import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../../components/Error"
import { Loading } from "../../components/Loading"

export const Route = createFileRoute("/games/$gameId")({
  component: RouteComponent,
})

function RouteComponent() {
  const { gameId } = Route.useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ["games", gameId],
    queryFn: async () => {
      return await query.game(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  return (
    <div>
      <h1>{data.name}</h1>
    </div>
  )
}
