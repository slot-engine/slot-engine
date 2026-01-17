import { useState, useEffect, memo } from "react"
import { cn } from "../../lib/cn"

const CELL_SIZE = 40

interface GridBackgroundProps {
  className?: string
  fadeDistance?: number
  variant?: "default" | "danger"
}

const GridCell = memo(() => (
  <div className="border-[0.5px] mix-blend-color-dodge border-ui-900 relative h-full w-full" />
))

export const GridBackground = ({
  className,
  variant = "default",
}: GridBackgroundProps) => {
  const [columns, setColumns] = useState(0)
  const [rows, setRows] = useState(0)

  useEffect(() => {
    const updateGrid = () => {
      setColumns(Math.ceil(window.innerWidth / CELL_SIZE))
      setRows(Math.ceil(window.innerHeight / CELL_SIZE))
    }

    updateGrid()
    window.addEventListener("resize", updateGrid)
    return () => window.removeEventListener("resize", updateGrid)
  }, [])

  const totalCells = columns * rows

  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div
        className={cn(
          "absolute -left-1/2 top-1/2 size-128 rounded-full block blur-3xl pointer-events-none",
          variant == "default" && "bg-cyan-500/50",
          variant == "danger" && "bg-red-700/50",
        )}
      />
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
        }}
      >
        {Array.from({ length: totalCells }).map((_, i) => (
          <GridCell key={i} />
        ))}
      </div>
    </div>
  )
}
