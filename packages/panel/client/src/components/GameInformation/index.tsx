import { useGameContext } from "../../context/GameContext"
import { GameNotConfigured } from "../Error/GameNotConfigured"
import { TableRow } from "../Table"

export const GameInformation = () => {
  const { game } = useGameContext()

  const basicInfo = [
    { label: "ID", value: game.id },
    { label: "Name", value: game.name },
    { label: "Path", value: game.path },
    { label: "Max Win X", value: game.maxWin },
    { label: "Game Modes", value: game.modes.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      {!game.isValid && <GameNotConfigured />}
      <div className="p-4 rounded-2xl bg-ui-900 shadow-card">
        {basicInfo.map((info, i) => (
          <TableRow
            key={i}
            label={info.label}
            value={info.value}
            className="grid grid-cols-[10rem_minmax(0,1fr)] justify-items-start"
          />
        ))}
      </div>
    </div>
  )
}
