import { ErrorDisplay } from "@/components/Error"
import { ReelSetDesigner } from "@/components/GameReelSetDesigner"
import { PageContent } from "@/components/Page"
import { Skeleton } from "@/components/Skeleton"
import { useGameContext } from "@/context/GameContext"
import { ReelsetEditorProvider, useEditorContext } from "@/context/ReelsetEditorContext"
import { query } from "@/lib/queries"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/games/$gameId/reelset-designer/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "reel-sets", gameId],
    queryFn: async () => {
      return await query.gameReelSets(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="pt-8">
        <Skeleton className="h-32" />
        <Skeleton className="h-32 mt-4" />
        <Skeleton className="h-32 mt-4" />
      </div>
    )
  }

  return (
    <ReelsetEditorProvider reelSets={data.reelSets}>
      <PageContent sidebar={<Sidebar />} classNames={{ content: "py-0 pl-0" }}>
        <ReelSetDesigner />
      </PageContent>
    </ReelsetEditorProvider>
  )
}

const Sidebar = () => {
  const { reelSets, activeReelsetName } = useEditorContext()
  return <div></div>
}
