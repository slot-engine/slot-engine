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
    <div>
      {!game.isValid && <GameNotConfigured />}
      <div>
        {basicInfo.map((info, i) => (
          <TableRow key={i} label={info.label} value={info.value} />
        ))}
      </div>
    </div>
  )
}
