import { createFileRoute } from "@tanstack/react-router"
import { GameInformation } from "@/components/GameInformation"
import { StatisticsSummary } from "@/components/GameStatsSummary"
import { StatisticsPayouts } from "@/components/GameStatsPayouts"
import { PageContent } from "@/components/Page"

export const Route = createFileRoute("/games/$gameId/info/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <PageContent>
      <GameInformation />

      <div className="mt-8">
        <StatisticsSummary />
      </div>
      <div className="mt-8">
        <StatisticsPayouts />
      </div>
    </PageContent>
  )
}
