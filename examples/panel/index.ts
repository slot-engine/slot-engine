import { EngineLgs, InMemoryStorage } from "@slot-engine/lgs"
import { createPanel } from "@slot-engine/panel"
import { game as ClusterGame } from "../cluster_example"
import { game as LinesGame } from "../lines_example"

const panel = createPanel({
  games: [ClusterGame, LinesGame],
  lgs: new EngineLgs({ storage: new InMemoryStorage() }),
})

panel.start()
